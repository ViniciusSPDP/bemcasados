"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { MapPin, Gift, HeartHandshake } from "lucide-react";
import { InviteOrnament } from "@/components/public/invite-ornament";
import { RsvpDialog } from "@/components/public/rsvp-dialog";
import { eventDateParts } from "@/lib/event-date";

interface Props {
    slug: string;
    coupleName: string;
    /** ISO — `Date` não atravessa a fronteira server→client. */
    eventDate: string;
    monogram: string | null;
    verse: string | null;
    time: string | null;
    venue: string | null;
    address: string | null;
    mapsUrl: string | null;
    backgroundUrl: string | null;
    /** Se a vitrine do Mercado Livre tem itens — é para lá que o botão leva. */
    hasVitrine: boolean;
    /** Lista de contribuição em dinheiro, usada quando não há vitrine montada. */
    hasGifts: boolean;
}

/**
 * Separa "Joana & Junior" / "Joana e Junior" nos dois nomes, para escrevê-los em
 * linhas próprias com o "&" no meio, como no convite impresso. Se não houver
 * separador reconhecível, mostra o texto inteiro numa linha só.
 */
function splitCouple(name: string): [string, string] | null {
    const match = name.split(/\s+(?:&|e)\s+/i);
    return match.length === 2 ? [match[0].trim(), match[1].trim()] : null;
}

const WEEKDAYS = ["DOMINGO", "SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO"];
const MONTHS = [
    "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
    "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO",
];

export function InviteContent({
    slug,
    coupleName,
    eventDate,
    monogram,
    verse,
    time,
    venue,
    address,
    mapsUrl,
    backgroundUrl,
    hasVitrine,
    hasGifts,
}: Props) {
    const [showRsvp, setShowRsvp] = useState(false);

    // Quem pediu menos animação no sistema recebe a tela pronta, sem espera.
    const reduceMotion = useReducedMotion();

    /**
     * Tempo com a foto limpa antes do véu entrar. Sem foto não há o que revelar,
     * então o convite aparece quase imediatamente — esperar seria uma pausa
     * olhando para um fundo liso.
     */
    const revealDelay = !backgroundUrl || reduceMotion ? 0 : 1.4;

    // `eventDate` é gravado como data pura (00:00 UTC). `eventDateParts` lê em
    // UTC — sem isso o fuso do celular do convidado mostra o dia anterior, que
    // foi o bug da página pública.
    const parts = eventDateParts(eventDate);
    const weekday = WEEKDAYS[parts.weekday];
    const month = MONTHS[parts.month];
    const day = String(parts.day).padStart(2, "0");
    const year = parts.year;

    const couple = splitCouple(coupleName);

    return (
        // `min-h-[100lvh]` mede a tela COM as barras do Safari recolhidas, então
        // a página fica um pouco mais alta que o espaço visível enquanto elas
        // estão abertas. Esse excesso é o que dá rolagem — e é rolando que o
        // Safari encolhe a barra até o formato de pílula, deixando o convite
        // correr por baixo dela. Com `dvh` o conteúdo caberia exato, a página
        // nunca rolaria e a barra ficaria expandida para sempre, cortando o
        // convite embaixo.
        <main className="relative min-h-[100lvh] overflow-hidden bg-[#0a1628]">
            {/*
              O `<body>` do layout raiz é `bg-gray-50`. No iPhone isso aparecia
              como uma faixa branca quando a rolagem passa do fim (o "elástico"
              do Safari) e atrás das barras do navegador, cortando o convite em
              cima e embaixo. Tingir o documento inteiro de azul-marinho faz o
              fundo continuar até as bordas da tela.
            */}
            <style>{`html,body{background-color:#0a1628}`}</style>
            {/*
              Foto do casal ao fundo. O véu é só o necessário para o texto ter
              contraste — a foto precisa ser reconhecível, senão não vale estar ali.
              Sem foto, fica o azul-marinho liso.

              `absolute` e não `fixed`: preso ao viewport, o fundo ficava parado
              enquanto o convite rolava — a foto não acompanhava o movimento e as
              duas camadas pareciam descoladas. Ancorado no `<main>`, o fundo tem
              a altura do documento e rola junto com o convite.
            */}
            {backgroundUrl && (
                <div className="absolute inset-0 z-0">
                    {/*
                      Camada de baixo: a foto limpa, que fica sozinha no primeiro
                      segundo. É o momento em que o convidado vê o casal.
                    */}
                    <Image
                        src={backgroundUrl}
                        alt=""
                        fill
                        priority
                        className="scale-110 object-cover"
                    />

                    {/*
                      Camada de cima: a MESMA foto, já desfocada, mais o véu. Ela
                      entra por transparência, então o que anima é só `opacity` —
                      que a GPU compõe sozinha. Animar `filter: blur` daria o
                      mesmo efeito e engasgaria no celular, que é justamente onde
                      isto precisa ficar suave. A imagem é a mesma URL, então não
                      há segundo download.

                      O desfoque em si vive aqui, na imagem, e não no cartão com
                      `backdrop-filter`: o Safari do iPhone desativa esse recurso
                      em várias situações e, quando isso acontece, sobra a foto
                      nítida atrás do texto. `filter: blur` funciona em todo lugar.
                    */}
                    <motion.div
                        className="absolute inset-0"
                        initial={{ opacity: reduceMotion ? 1 : 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: revealDelay, duration: reduceMotion ? 0 : 1.2, ease: "easeOut" }}
                    >
                        <Image
                            src={backgroundUrl}
                            alt=""
                            fill
                            priority
                            className="scale-110 object-cover blur-[3px]"
                        />
                        {/*
                          Véu UNIFORME, e não um gradiente escurecendo as pontas.
                          O gradiente deixava ~85% de azul chapado no topo e no
                          rodapé, e o resultado era uma faixa lisa emendando com a
                          foto no meio da tela — o corte ficava evidente logo
                          abaixo da barra de status. Com opacidade constante a
                          imagem corre contínua de ponta a ponta.
                        */}
                        <div className="absolute inset-0 bg-[#0a1628]/55" />
                    </motion.div>
                </div>
            )}


            {/*
              O padding usa `max(...)` com `env(safe-area-inset-*)`: no iPhone a
              Dynamic Island e a faixa inferior de gestos ficam por cima do
              conteúdo, e sem isto o topo do convite passa por baixo delas. Nos
              aparelhos sem recorte, `env()` vale 0 e prevalece o padding normal.
            */}
            <div className="relative z-10 flex min-h-[100lvh] items-center justify-center px-4 pt-[max(2.5rem,calc(env(safe-area-inset-top)+1.5rem))] pb-[max(2.5rem,calc(env(safe-area-inset-bottom)+1.5rem))]">
                {/*
                  O cartão é translúcido para a foto aparecer através dele — no
                  celular ele ocupa quase a tela toda, e um fundo opaco esconderia
                  justamente a foto do casal.
                  A opacidade é alta o bastante para o texto se sustentar sozinho,
                  sem depender de `backdrop-filter`: ele é só um refinamento onde
                  o navegador colabora, nunca o que garante a leitura.
                */}
                <motion.article
                    initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 70 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                        // Entra depois que o véu já cobriu a foto: o convidado vê
                        // o casal, a imagem recua, e só então o convite sobe.
                        delay: reduceMotion ? 0 : revealDelay + 0.75,
                        duration: reduceMotion ? 0 : 1,
                        ease: [0.22, 1, 0.36, 1],
                    }}
                    className={`relative w-full max-w-md overflow-hidden rounded-sm px-7 py-12 text-center shadow-2xl ring-1 ring-[#c9a227]/40 sm:px-10 ${
                        backgroundUrl
                            ? "bg-[#0a1628]/85 supports-[backdrop-filter]:bg-[#0a1628]/75 supports-[backdrop-filter]:backdrop-blur-md"
                            : "bg-[#0a1628]"
                    }`}
                >
                    <InviteOrnament className="pointer-events-none absolute -left-6 -top-6 h-40 w-40 text-[#c9a227]/35" />
                    <InviteOrnament className="pointer-events-none absolute -bottom-6 -right-6 h-40 w-40 rotate-180 text-[#c9a227]/35" />

                    {monogram && (
                        <p className="font-serif text-4xl tracking-[0.2em] text-[#c9a227] [text-shadow:0_2px_6px_rgba(0,0,0,0.5)]">
                            {monogram}
                        </p>
                    )}

                    {verse && (
                        <p className="mx-auto mt-7 max-w-xs text-[0.7rem] uppercase leading-relaxed tracking-[0.18em] text-slate-200 [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]">
                            {verse}
                        </p>
                    )}

                    <div className="my-9">
                        {couple ? (
                            <>
                                <h1 className="font-script text-5xl leading-tight text-white sm:text-6xl [text-shadow:0_2px_8px_rgba(0,0,0,0.6)]">
                                    {couple[0]}
                                </h1>
                                <span className="my-1 block font-script text-3xl text-[#c9a227]">&</span>
                                <p className="font-script text-5xl leading-tight text-white sm:text-6xl [text-shadow:0_2px_8px_rgba(0,0,0,0.6)]">
                                    {couple[1]}
                                </p>
                            </>
                        ) : (
                            <h1 className="font-script text-5xl leading-tight text-white sm:text-6xl [text-shadow:0_2px_8px_rgba(0,0,0,0.6)]">
                                {coupleName}
                            </h1>
                        )}
                    </div>

                    <p className="text-[0.7rem] uppercase leading-relaxed tracking-[0.18em] text-slate-200 [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]">
                        Convidam para a cerimônia
                        <br />
                        de seu casamento
                    </p>

                    {/* Data no formato do convite impresso: dia grande entre filetes,
                        com o mês à esquerda e o horário à direita.

                        O miolo é uma GRADE `1fr auto 1fr`, e não um flex: as duas
                        colunas laterais ficam com a MESMA largura, então o número
                        do dia cai no centro exato do bloco — e o dia da semana e o
                        ano, centralizados no mesmo bloco, se alinham com ele.

                        Com flex o dia ficava onde sobrasse, deslocado pela
                        diferença de largura entre o mês e a hora: "MAIO 08 20:30h"
                        empurrava o número para a esquerda e "OUTUBRO 25 15:00h"
                        para a direita. O olho lê o número grande como o centro,
                        então DOMINGO e 2026 pareciam tortos em cima dele.

                        A coluna da hora ocupa espaço mesmo vazia, de propósito:
                        sem horário cadastrado o dia continua centralizado, em vez
                        de escorregar para a direita. */}
                    <div className="mt-8 flex items-center justify-center gap-4 text-[#c9a227]">
                        <span className="h-px flex-1 bg-[#c9a227]/40" />
                        <div className="shrink-0">
                            <p className="text-[0.65rem] uppercase tracking-[0.2em]">{weekday}</p>
                            <div className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-2">
                                <span className="justify-self-end text-[0.65rem] uppercase tracking-[0.2em]">
                                    {month}
                                </span>
                                <span className="font-serif text-4xl text-white [text-shadow:0_2px_6px_rgba(0,0,0,0.5)]">
                                    {day}
                                </span>
                                <span className="justify-self-start text-[0.65rem] uppercase tracking-[0.2em]">
                                    {time ? `${time}h` : ""}
                                </span>
                            </div>
                            <p className="text-[0.65rem] tracking-[0.2em]">{year}</p>
                        </div>
                        <span className="h-px flex-1 bg-[#c9a227]/40" />
                    </div>

                    <div className="mt-10 flex items-start justify-center gap-5 sm:gap-7">
                        {mapsUrl ? (
                            <InviteAction
                                as="a"
                                href={mapsUrl}
                                icon={<MapPin size={22} />}
                                label={"Localização\ncerimônia"}
                            />
                        ) : (
                            <InviteAction
                                as="button"
                                disabled
                                icon={<MapPin size={22} />}
                                label={"Localização\ncerimônia"}
                            />
                        )}

                        {/* Vai para a vitrine do Mercado Livre; se o casal ainda
                            não montou uma, cai na lista de contribuição. */}
                        <InviteAction
                            as="link"
                            href={
                                hasVitrine
                                    ? `/${slug}/vitrine`
                                    : hasGifts
                                      ? `/${slug}`
                                      : undefined
                            }
                            icon={<Gift size={22} />}
                            label={"Sugestão de\npresente"}
                        />

                        {/* Abre o diálogo de confirmação. O convidado responde
                            sem sair do convite — mandá-lo para outra página
                            perderia quem só abriu o link de passagem. */}
                        <InviteAction
                            as="button"
                            onClick={() => setShowRsvp(true)}
                            icon={<HeartHandshake size={22} />}
                            label={"Confirmar\npresença"}
                        />
                    </div>

                    <p className="mt-7 text-[0.65rem] uppercase tracking-[0.18em] text-slate-400">
                        Toque nos ícones para interagir
                    </p>

                    {(venue || address) && (
                        <div className="mt-9 border-t border-[#c9a227]/25 pt-7">
                            {venue && (
                                <p className="font-serif text-lg text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.5)]">{venue}</p>
                            )}
                            {address && (
                                <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{address}</p>
                            )}
                        </div>
                    )}
                </motion.article>
            </div>

            <RsvpDialog slug={slug} isOpen={showRsvp} onClose={() => setShowRsvp(false)} />
        </main>
    );
}

interface ActionProps {
    as: "a" | "link" | "button";
    href?: string;
    onClick?: () => void;
    disabled?: boolean;
    icon: React.ReactNode;
    label: string;
}

/** Ícone circular dourado + rótulo em duas linhas, como no convite de papel. */
function InviteAction({ as, href, onClick, disabled, icon, label }: ActionProps) {
    const inactive = disabled || (as !== "button" && !href);

    const circle = (
        <span
            className={`flex h-14 w-14 items-center justify-center rounded-full border transition ${
                inactive
                    ? "border-[#c9a227]/25 bg-[#c9a227]/5 text-[#c9a227]/40"
                    : "border-[#c9a227]/60 bg-[#c9a227]/15 text-[#c9a227] group-hover:bg-[#c9a227]/25 group-hover:border-[#c9a227]"
            }`}
        >
            {icon}
        </span>
    );

    const text = (
        <span
            className={`mt-2.5 block whitespace-pre-line text-[0.6rem] uppercase leading-snug tracking-[0.12em] ${
                inactive ? "text-slate-500" : "text-slate-300"
            }`}
        >
            {label}
        </span>
    );

    const classes = "group flex w-20 flex-col items-center text-center";

    if (inactive && as !== "button") {
        return (
            <span className={classes} aria-disabled="true">
                {circle}
                {text}
            </span>
        );
    }

    if (as === "a") {
        return (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={classes}
            >
                {circle}
                {text}
            </a>
        );
    }

    if (as === "link") {
        return (
            <Link href={href!} className={classes}>
                {circle}
                {text}
            </Link>
        );
    }

    return (
        <button type="button" onClick={onClick} className={classes}>
            {circle}
            {text}
        </button>
    );
}
