export type IrabParticle = "は" | "が" | "を" | "に" | "で" | "の";

export interface IrabEntry {
  id: string;
  particle: IrabParticle;
  romaji: string;
  roleAr: string;
  functionAr: string;
  exampleJp: string;
  exampleRomaji: string;
  exampleAr: string;
  noteAr?: string;
}

export const IRAB_SEED: IrabEntry[] = [
  {
    id: "gr-wa",
    particle: "は",
    romaji: "wa",
    roleAr: "المبتدأ",
    functionAr: "يفتتح الكلام على موضوع — ما يُحَدَّث عنه (مبتدأ الجملة).",
    exampleJp: "私は学生です。",
    exampleRomaji: "watashi wa gakusei desu.",
    exampleAr: "أنا طالب.",
    noteAr: "يتّميز من «が»: «は» تُعرّف موضوع الجملة، لا فاعلها.",
  },
  {
    id: "gr-ga",
    particle: "が",
    romaji: "ga",
    roleAr: "الفاعل",
    functionAr: "تسمّي الفاعل، وتُشَدِّد عليه عند مقابلته بغيره.",
    exampleJp: "雨が降ります。",
    exampleRomaji: "ame ga furimasu.",
    exampleAr: "تمطر السماء.",
    noteAr: "عند المماثلة — الآتي مع الجواب على السؤال — يظهر المعنى: «هو الفاعل لا غيره».",
  },
  {
    id: "gr-wo",
    particle: "を",
    romaji: "wo",
    roleAr: "المفعول به",
    functionAr: "تحدّد مسار الفعل المباشر — ما وقع عليه الفعل.",
    exampleJp: "水を飲みます。",
    exampleRomaji: "mizu o nomimasu.",
    exampleAr: "أشرب الماء.",
  },
  {
    id: "gr-ni",
    particle: "に",
    romaji: "ni",
    roleAr: "حرف الجرّ للغاية والزمان",
    functionAr: "تعبّر عن الوجهة والغاية (إلى/عند)، وميِّز لحظةَ الحدوث.",
    exampleJp: "学校に行きます。",
    exampleRomaji: "gakkou ni ikimasu.",
    exampleAr: "أذهب إلى المدرسة.",
    noteAr: "إذا دخلت على زمان جاءت بمعنى «في»: 九時に起きます",
  },
  {
    id: "gr-de",
    particle: "で",
    romaji: "de",
    roleAr: "حرف الجرّ للمكان والوسيلة",
    functionAr: "تحدّد مكان الحدوث أو الوسيلة (بالـ/في).",
    exampleJp: "電車で行きます。",
    exampleRomaji: "densha de ikimasu.",
    exampleAr: "أذهب بالقطار الكهربائي.",
  },
  {
    id: "gr-no",
    particle: "の",
    romaji: "no",
    roleAr: "المضاف إليه",
    functionAr: "تربط الاسمين بالتعلّق والإضافة — مضاف ومضاف إليه.",
    exampleJp: "先生の本。",
    exampleRomaji: "sensei no hon.",
    exampleAr: "كتاب المعلّم.",
  },
];