/**
 * Ornamento floral dos cantos do convite.
 *
 * SVG inline, e não imagem: a CSP só permite `img-src 'self' data: blob:` mais
 * dois hosts, então uma arte de terceiro exigiria alargá-la ou subir o arquivo
 * para o bucket. Inline também acompanha a cor do texto via `currentColor`, o
 * que deixa o ornamento herdar o dourado sem duplicar o valor.
 */
export function InviteOrnament({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            aria-hidden="true"
        >
            {/* Ramo principal e secundários */}
            <g stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
                <path d="M4 8C22 20 38 38 50 60" />
                <path d="M10 30C24 34 36 44 44 58" />
                <path d="M30 6C36 20 42 34 44 50" />
                <path d="M6 52C18 52 30 58 38 68" />
                <path d="M52 12C54 26 54 40 50 52" />
            </g>

            {/* Folhas */}
            <g fill="currentColor" opacity="0.55">
                <ellipse cx="20" cy="24" rx="7" ry="3.4" transform="rotate(38 20 24)" />
                <ellipse cx="34" cy="42" rx="8" ry="3.6" transform="rotate(44 34 42)" />
                <ellipse cx="14" cy="44" rx="6.5" ry="3.2" transform="rotate(-18 14 44)" />
                <ellipse cx="45" cy="26" rx="6" ry="3" transform="rotate(72 45 26)" />
                <ellipse cx="28" cy="62" rx="7" ry="3.2" transform="rotate(-10 28 62)" />
            </g>

            {/* Flores de cinco pétalas */}
            <g fill="currentColor">
                <g opacity="0.9">
                    {[0, 72, 144, 216, 288].map((angle) => (
                        <ellipse
                            key={`f1-${angle}`}
                            cx="14"
                            cy="8"
                            rx="3.4"
                            ry="6"
                            transform={`rotate(${angle} 14 14)`}
                        />
                    ))}
                    <circle cx="14" cy="14" r="2.4" opacity="0.6" />
                </g>

                <g opacity="0.75">
                    {[0, 72, 144, 216, 288].map((angle) => (
                        <ellipse
                            key={`f2-${angle}`}
                            cx="44"
                            cy="60"
                            rx="2.8"
                            ry="5"
                            transform={`rotate(${angle} 44 66)`}
                        />
                    ))}
                    <circle cx="44" cy="66" r="2" opacity="0.6" />
                </g>

                <g opacity="0.65">
                    {[0, 72, 144, 216, 288].map((angle) => (
                        <ellipse
                            key={`f3-${angle}`}
                            cx="58"
                            cy="12"
                            rx="2.4"
                            ry="4.4"
                            transform={`rotate(${angle} 58 17)`}
                        />
                    ))}
                    <circle cx="58" cy="17" r="1.8" opacity="0.6" />
                </g>
            </g>

            {/* Botões fechados, para quebrar a repetição */}
            <g fill="currentColor" opacity="0.5">
                <circle cx="6" cy="36" r="2.2" />
                <circle cx="38" cy="16" r="1.9" />
                <circle cx="24" cy="52" r="1.7" />
                <circle cx="50" cy="44" r="2" />
            </g>
        </svg>
    );
}
