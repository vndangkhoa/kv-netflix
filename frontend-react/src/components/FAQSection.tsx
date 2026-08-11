import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { useLang } from '../context/LanguageContext';

const FAQ_KEYS = [
    'faqFree', 'faqUpdate', 'faqQuality', 'faqDevice', 'faqServer',
    'faqSeek', 'faqTheater', 'faqDub', 'faqAnime', 'faqSpeed',
] as const;

export const FAQSection = () => {
    const { t } = useLang();
    const [open, setOpen] = useState<number>(0);

    return (
        <section className="px-4 sm:px-6 lg:px-12 my-12 max-w-5xl mx-auto">
            <div className="mb-6 text-center">
                <div className="flex items-center justify-center gap-2 text-[var(--accent)] mb-1">
                    <HelpCircle size={18} />
                </div>
                <h2
                    className="text-2xl font-bold text-[var(--accent)] mb-1.5"
                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                >
                    {t.faqTitle}
                </h2>
                <p className="text-sm text-[#888c9d] font-light">{t.faqSubtitle}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3">
                {FAQ_KEYS.map((key, i) => (
                    <div
                        key={key}
                        className={`faq-item ${open === i ? 'active' : ''} cursor-pointer rounded-lg border transition-all duration-200 h-fit`}
                        style={{
                            background: 'rgba(255,255,255,0.025)',
                            borderColor: open === i
                                ? 'color-mix(in srgb, var(--accent) 40%, transparent)'
                                : 'rgba(255,255,255,0.06)',
                            boxShadow: open === i ? '0 4px 20px color-mix(in srgb, var(--accent) 4%, transparent)' : undefined,
                        }}
                        onClick={() => setOpen(open === i ? -1 : i)}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(open === i ? -1 : i); } }}
                    >
                        <div className="flex items-center justify-between gap-3 px-4 py-3.5 select-none">
                            <span className={`text-[13.5px] font-semibold leading-snug ${open === i ? 'text-[var(--accent)]' : 'text-white'}`}>
                                {t[`${key}Q` as keyof typeof t] as string}
                            </span>
                            <ChevronDown
                                size={14}
                                className={`shrink-0 transition-transform duration-250 ${open === i ? 'rotate-180 text-[var(--accent)]' : 'text-white/40'}`}
                            />
                        </div>
                        <div className="faq-answer-wrapper">
                            <div className="faq-answer-inner">
                                <div
                                    className="px-4 pb-4 pt-3 text-[13px] font-light leading-relaxed border-t"
                                    style={{ color: '#a5a9bc', borderColor: 'rgba(255,255,255,0.05)' }}
                                >
                                    {t[`${key}A` as keyof typeof t] as string}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};
