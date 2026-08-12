from __future__ import annotations

import html
import sys
from pathlib import Path
from zipfile import ZIP_STORED, ZipFile

SENTENCES = (
    # Daily life
    "毎朝六時に起きます。",
    "窓を開けると、新鮮な空気が入ってきます。",
    "顔を洗ってから、朝ご飯を作ります。",
    "朝ご飯にはいつもパンと卵を食べます。",
    "コーヒーを飲みながら、天気予報を見ました。",
    "今日は少し寒いので、厚い上着を着ます。",
    "家を出る前に、電気を全部消しました。",
    "駅まで歩くと、十五分ぐらいかかります。",
    "電車の中で小説を読むのが好きです。",
    "会社に着いたら、最初にメールを確認します。",
    "昼休みは同僚と近くの食堂へ行きます。",
    "午後は大切な会議が一つあります。",
    "仕事が終わったら、スーパーで野菜を買います。",
    "帰り道で友達に偶然会いました。",
    "家に帰ると、猫が玄関で待っていました。",
    "夕食の前に、少し部屋を片付けます。",
    "母から電話があったので、長く話しました。",
    "夜は音楽を聞きながら料理をします。",
    "寝る前に、明日の予定を手帳に書きます。",
    "毎日少しずつ運動するようにしています。",
    # Home and people
    "私の部屋は二階の一番奥にあります。",
    "机の上に新しいノートを置きました。",
    "本棚には日本語の本がたくさんあります。",
    "週末に家族と一緒に掃除をしました。",
    "弟は台所で昼ご飯を作っています。",
    "姉は来月から大学で勉強を始めます。",
    "父は毎週日曜日に庭の木を手入れします。",
    "母は旅行の写真をアルバムに整理しました。",
    "祖父は昔の話を面白そうに聞かせてくれます。",
    "祖母の作る煮物はとてもおいしいです。",
    "家族で同じテーブルを囲む時間が大切です。",
    "友達の誕生日に小さなプレゼントを贈りました。",
    "彼は困っている人を見ると、すぐに助けます。",
    "彼女は明るくて、誰とでもすぐ仲良くなれます。",
    "新しい隣人が先週引っ越してきました。",
    "近所の人と朝に挨拶を交わしました。",
    "この椅子は古いですが、まだ十分使えます。",
    "窓のそばに小さな植物を育てています。",
    "部屋が暑かったので、扇風機をつけました。",
    "週末には家でゆっくり過ごしたいです。",
    # Travel and town
    "来週、京都へ二泊三日の旅行に行きます。",
    "新幹線の切符をインターネットで予約しました。",
    "駅の案内所で地図をもらいました。",
    "ホテルは駅から歩いて五分の場所にあります。",
    "荷物を置いてから、古いお寺を見に行きました。",
    "境内には大きな木が何本も立っています。",
    "静かな庭を見ていると、心が落ち着きます。",
    "昼食に名物のうどんを食べました。",
    "店員さんがおすすめの料理を教えてくれました。",
    "午後はバスに乗って山の近くまで行きました。",
    "雨が降りそうだったので、傘を持って出ました。",
    "道に迷ったとき、親切な女性が助けてくれました。",
    "この町には小さな美術館がいくつもあります。",
    "美術館では地元の画家の作品を見ました。",
    "夕方になると、通りの明かりがつき始めます。",
    "市場では新鮮な魚や果物が売られています。",
    "お土産に友達のためのお菓子を買いました。",
    "帰りの電車では、旅の写真を整理しました。",
    "短い旅行でしたが、思い出がたくさんできました。",
    "次は秋に北海道を訪れてみたいです。",
    # Study and work
    "日本語を勉強するために毎日時間を作っています。",
    "新しい単語をノートに書いて、声に出して読みます。",
    "漢字の形を覚えるには、何度も練習が必要です。",
    "先生は難しい文法をわかりやすく説明しました。",
    "授業のあとで、友達と宿題について話しました。",
    "わからない言葉は辞書で調べるようにしています。",
    "昨日覚えた表現を今日の会話で使えました。",
    "間違いを恐れずに話すことが上達への近道です。",
    "毎週一冊、短い日本語の本を読むつもりです。",
    "聞き取りの練習のために、ニュースを聞きます。",
    "会議の前に、必要な資料を印刷しておきました。",
    "この仕事は思ったより時間がかかりました。",
    "チームのみんなで問題の解決方法を考えています。",
    "上司は新しい計画について意見を求めました。",
    "私は自分の考えを簡単な言葉で説明しました。",
    "午後三時までに報告書を提出しなければなりません。",
    "忙しい日でも、休憩を取ることを忘れないでください。",
    "同僚が仕事を手伝ってくれたので助かりました。",
    "明日の予定を確認してから、パソコンを閉じます。",
    "経験を積めば、もっと自信を持って働けるでしょう。",
    # Food and seasons
    "春になると、公園の桜が美しく咲きます。",
    "暖かい日に友達と花見をする予定です。",
    "夏の朝は早く明るくなるので、散歩に向いています。",
    "暑い日は冷たい水をこまめに飲みます。",
    "海の近くで食べるアイスクリームは特別においしいです。",
    "秋には山の木々が赤や黄色に変わります。",
    "落ち葉を踏むと、かわいた音がします。",
    "冬の夜は温かい鍋料理を家族で囲みます。",
    "今日は白菜ときのこをたくさん買いました。",
    "料理を始める前に、材料を全部切っておきます。",
    "このスープには少し塩を入れると味がよくなります。",
    "辛い料理が苦手なので、唐辛子を入れません。",
    "母は毎朝新しいお弁当を作ってくれます。",
    "昼のお弁当には小さなりんごが入っていました。",
    "友達が手作りのケーキを持ってきてくれました。",
    "食べる前に、みんなで写真を撮りました。",
    "このレストランでは地元の食材を使っています。",
    "注文した料理が来るまで、窓の外を眺めました。",
    "食事のあとで、温かいお茶を一杯飲みました。",
    "季節の食べ物を味わうと、時間の変化を感じます。",
    # Thoughts and plans
    "今朝は空が青くて、気持ちのよい一日になりそうです。",
    "小さな目標でも、毎日続ければ大きな力になります。",
    "新しいことを始める前に、計画を立てます。",
    "失敗したときは、原因を考えて次に生かします。",
    "わからないことを質問するのは恥ずかしいことではありません。",
    "人の話を最後まで聞くことを大切にしています。",
    "約束の時間には、いつも少し早く着くようにします。",
    "忙しくても、大切な人に連絡する時間を作ります。",
    "今日は昨日より少し長く日本語を話しました。",
    "新しい言葉を一つ覚えるたびに、うれしくなります。",
    "将来は日本のいろいろな町で暮らしてみたいです。",
    "そのために、今は会話の練習を続けています。",
    "来月から朝の読書を習慣にするつもりです。",
    "週末には図書館で静かに勉強します。",
    "読み終わった本の感想を友達と共有したいです。",
    "天気がよければ、午後に自転車で出かけます。",
    "もし雨が降ったら、家で映画を見ます。",
    "一日の終わりに、できたことを三つ思い出します。",
    "明日は今日より一歩前に進めると信じています。",
    "日本語で自分の気持ちを自然に話せるようになりたいです。",
)


def _chapter_markup(chapter_number: int, sentences: tuple[str, ...]) -> str:
    title = f"第{chapter_number}章"
    paragraph = html.escape("".join(sentences))
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" lang="ja" xml:lang="ja">
  <head><title>{title}</title></head>
  <body>
    <h1>{title}</h1>
    <p>{paragraph}</p>
  </body>
</html>
"""


def write_epub(output_path: Path) -> None:
    if len(SENTENCES) != 120:
        raise RuntimeError(f"Expected 120 sentences, found {len(SENTENCES)}")

    chapters = [SENTENCES[index : index + 20] for index in range(0, len(SENTENCES), 20)]
    output_path.parent.mkdir(parents=True, exist_ok=True)
    container = """<?xml version="1.0" encoding="UTF-8"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml" /></rootfiles>
</container>
"""
    manifest_items = "\n".join(
        f'    <item id="chapter-{index}" href="chapter-{index}.xhtml" media-type="application/xhtml+xml" />'
        for index in range(1, len(chapters) + 1)
    )
    spine_items = "\n".join(f'    <itemref idref="chapter-{index}" />' for index in range(1, len(chapters) + 1))
    package = f"""<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">textplex:japanese-120-sentences</dc:identifier>
    <dc:title>Japanese Sentence Practice: 120 Sentences</dc:title>
    <dc:language>ja</dc:language>
    <dc:creator>TextPlex</dc:creator>
  </metadata>
  <manifest>
{manifest_items}
  </manifest>
  <spine>
{spine_items}
  </spine>
</package>
"""

    with ZipFile(output_path, "w") as archive:
        archive.writestr("mimetype", "application/epub+zip", compress_type=ZIP_STORED)
        archive.writestr("META-INF/container.xml", container)
        archive.writestr("OEBPS/content.opf", package)
        for index, chapter in enumerate(chapters, start=1):
            archive.writestr(f"OEBPS/chapter-{index}.xhtml", _chapter_markup(index, chapter))


if __name__ == "__main__":
    destination = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("artifacts/japanese-120-sentences.epub")
    write_epub(destination)
    print(destination.resolve())
