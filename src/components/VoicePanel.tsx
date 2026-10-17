"use client";

import { playVocabWord } from "@/lib/japanese-audio";
import { phraseAudioUrl } from "@/lib/japanese-audio-manifest";
import { speakJapanese } from "@/lib/japanese-tts";
import { useJapaneseVoice, type JapaneseVoiceState } from "@/lib/use-japanese-voice";
import { IconVolume } from "./icons";

const SAMPLE_TEXT = "こんにちは。きょうは いい 天気ですね。";
const SAMPLE_READING = "こんにちは。きょうはいいてんきですね。";
const BUNDLED_SAMPLE = "カフェでコーヒーを飲みました";
const BUNDLED_SAMPLE_READING = "かふぇでこーひーをのみました";

const OS_HINTS: Record<JapaneseVoiceState, string> = {
  checking: "جارٍ البحث عن أصوات النظام…",
  available: "يُستخدم هذا الصوت للنصوص الحرة التي لا يوجد لها تسجيل مدمج.",
  missing:
    "لا يوجد صوت ياباني على هذا الجهاز — النصوص غير المسجلة تُنطَق حالياً بالمولّد المدمج.",
};

export default function VoicePanel() {
  const { state, voices, refresh } = useJapaneseVoice();

  return (
    <div data-testid="voice-panel" className="space-y-3">
      <div className="rounded-xl border border-line bg-void/50 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="lang-ar text-sm font-bold text-cream">التسجيلات المدمجة</span>
          <span className="chip is-cyan">مفعّلة</span>
        </div>
        <p className="lang-ar mt-1.5 text-xs leading-relaxed text-muted">
          كل عبارات التدريب والألعاب تأتي مع تسجيل جاهز داخل التطبيق — يُشغَّل أولاً قبل أي صوت آخر.
        </p>
        <button
          type="button"
          data-testid="voice-sample-bundled"
          onClick={() =>
            playVocabWord({
              audioUrl: phraseAudioUrl(BUNDLED_SAMPLE),
              reading: BUNDLED_SAMPLE_READING,
            })
          }
          className="btn-mini mt-2.5 flex items-center justify-between gap-1"
        >
          <IconVolume className="size-4.5" />
          <span className="lang-ar">عيّنة من التسجيل</span>
        </button>
      </div>

      <div className="rounded-xl border border-line bg-void/50 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="lang-ar text-sm font-bold text-cream">صوت النظام الياباني</span>
          {state === "checking" && (
            <span data-testid="voice-os-status" className="chip">
              فحص…
            </span>
          )}
          {state === "available" && (
            <span data-testid="voice-os-status" className="chip is-cyan">
              متوفر
            </span>
          )}
          {state === "missing" && (
            <span data-testid="voice-os-status" className="chip is-hazard">
              غير مثبّت
            </span>
          )}
        </div>
        <p className="lang-ar mt-1.5 text-xs leading-relaxed text-muted">{OS_HINTS[state]}</p>

        {voices.length > 0 && (
          <ul data-testid="voice-list" className="mt-2 space-y-1">
            {voices.map((voice) => (
              <li
                key={`${voice.name}:${voice.lang}`}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span dir="ltr" className="truncate text-cream">
                  {voice.name}
                </span>
                <span className="telemetry flex-none text-faint">
                  {voice.lang} · {voice.localService ? "محلي" : "سحابي"}
                </span>
              </li>
            ))}
          </ul>
        )}

        {state === "missing" && (
          <ul className="lang-ar mt-2.5 space-y-1.5 text-[11px] leading-relaxed text-muted">
            <li>Edge (حاسب): الأصوات الطبيعية تُنزَّل تلقائياً — أضف لغة «اليابانية» من إعدادات ويندوز › الوقت واللغة.</li>
            <li>آيفون/آيباد: الإعدادات › إمكانية الوصول › المحتوى المنطوق › الأصوات › اليابانية.</li>
            <li>أندرويد: الإعدادات › النظام › اللغة والإدخال › تحويل النص إلى كلام › تنزيل بيانات اليابانية.</li>
          </ul>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="voice-sample-system"
            onClick={() => speakJapanese(SAMPLE_TEXT, { reading: SAMPLE_READING, rate: 0.85 })}
            className="btn-mini flex items-center justify-between gap-1"
          >
            <IconVolume className="size-4.5" />
            <span className="lang-ar">عيّنة صوت النظام</span>
          </button>
          <button type="button" data-testid="voice-recheck" onClick={refresh} className="btn-mini">
            <span className="lang-ar">إعادة الفحص</span>
          </button>
        </div>
      </div>
    </div>
  );
}
