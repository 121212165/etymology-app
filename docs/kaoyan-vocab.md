# 考研词库接入（kajweb/dict → kaoyan-vocab.json）

## 数据来源

- 仓库：[kajweb/dict](https://github.com/kajweb/dict)（有道词典/有道考神团队/新东方面包背单词词库的开源镜像）
- 获取时间：2026-09-01（经 `raw.githubusercontent.com` 逐个下载 zip 并用 `unzip -t` 校验完整）
- 书目清单（来自仓库 `bookLists.txt` 的 `data.normalBooksInfo`）：

| 书目 ID | 标题 | 来源 | 词数（bookLists 声明） | zip（master 分支 book/ 下） |
| --- | --- | --- | --- | --- |
| KaoYan_1 | 考研必考词汇（正序版） | 有道考神团队 | 1341 | `1521164669833_KaoYan_1.zip`（685,507 B） |
| KaoYan_2 | 考研英语词汇 | 有道词典 | 4533 | `1521164654696_KaoYan_2.zip`（2,431,155 B） |
| KaoYan_3 | 新东方考研词汇 | 新东方.考研词汇词根+联想记忆法 | 3728 | `1521164658897_KaoYan_3.zip`（1,838,572 B） |
| KaoYanluan_1 | 考研必考词汇（乱序版） | 有道考神团队 | 1341 | 未使用——与 KaoYan_1 词集相同，仅顺序不同 |

zip 内为 **NDJSON**（每行一个 JSON 对象，非 JSON 数组），解压后得到
`.cache/raw/KaoYan_1.json` / `KaoYan_2.json` / `KaoYan_3.json`，
行数与 bookLists 声明词数逐一吻合（1341 / 4533 / 3728）。

### 源文件校验和（sha1，下载时记录）

```
c05e17f909c3b154809fe45db15db50470dd9b45  1521164669833_KaoYan_1.zip
0aacd1d03d864367914c324a533833729e0acd96  1521164654696_KaoYan_2.zip
06c93267df705b02e200ebf025d1c268b67ae3ea  1521164658897_KaoYan_3.zip
eda01736cbe29a85823a00b1657318f031e78451  raw/KaoYan_1.json
f7a44137e6fa8168c46532f0e605482deab8700a  raw/KaoYan_2.json
d3e75bd2c8491e2abf9c2bee87bd37c952f05fe5  raw/KaoYan_3.json
```

### 重新获取（源文件缺失时）

```bash
mkdir -p .cache/book .cache/raw
curl -L -C - -o .cache/book/1521164669833_KaoYan_1.zip https://raw.githubusercontent.com/kajweb/dict/master/book/1521164669833_KaoYan_1.zip
curl -L -C - -o .cache/book/1521164654696_KaoYan_2.zip https://raw.githubusercontent.com/kajweb/dict/master/book/1521164654696_KaoYan_2.zip
curl -L -C - -o .cache/book/1521164658897_KaoYan_3.zip https://raw.githubusercontent.com/kajweb/dict/master/book/1521164658897_KaoYan_3.zip
unzip -o .cache/book/*.zip -d .cache/raw
npm run build:kaoyan
```

`-C -` 断点续传：raw.githubusercontent.com 大文件偶发中途断流（curl exit 56），
重跑同一条命令即可续传补齐；下载后用 `unzip -t` 校验。

## 源数据结构（单行示例，节选）

```json
{"wordRank":2,"headWord":"action","content":{"word":{"wordHead":"action","content":{
  "trans":[{"tranCn":"行动，动作；作用；运转；行为；战斗","pos":"n","tranOther":"..."}],
  ...}}},"bookId":"KaoYan_1"}
```

本管线只用 `headWord` 与 `content.word.content.trans[].{tranCn,pos}`；
例句/同近义词/短语等其余字段不消费。`headWord` 与 `word.wordHead`
已全量核对一致（0 条不一致），`tranCn` 无空值。

## 字段映射（scripts/lib/kaoyan.ts）

| 输出字段 | 来源与规则 |
| --- | --- |
| `word` | `headWord` 原样保留（含大小写：`March`/`X-ray` 等专有名词不强转小写，保证可溯源） |
| `tran` | 全部 `trans[].tranCn` 去空白后按源顺序用 `；` 连接（一条不丢） |
| `pos` | 全部 `trans[].pos` 去重（保序）后用 `/` 连接（如 `n/v`）；源缺失时省略该字段 |
| `book` | 固定常量 `"kaoyan"` |

产出：`public/data/kaoyan-vocab.json`，即
`KaoYanEntry[] = { word: string; pos?: string; tran: string; book: "kaoyan" }`。

## 去重与排序规则

- **去重键**：`word` 精确匹配（区分大小写）。三本书各自内部无重复；
  跨书重复 4545 次合并。
- **保留规则**（跨书同词取并集）：释义最全者优先——
  1. `tran` 长度更长者；
  2. 平局时书序靠前者（KaoYan_1 → KaoYan_2 → KaoYan_3）；
  3. 再平局 `tran` 码元序小者（保证完全确定）。
- **排序**：按 `word` 的码元序（不用 `localeCompare`，避免 ICU 差异破坏确定性）。
  因此大写开头词（专有名词）排在全表最前。
- **幂等**：排序确定性 + 无时间戳 → 重复运行输出逐字节相同（已用 sha1 验证）。

## 交集统计（2026-09-01 实际运行 `npm run build:kaoyan` 输出）

| 指标 | 数值 |
| --- | --- |
| 考研词库总词数（去重后） | **5057** |
| 与 vocab.json（5011 词）重合 | **3610** |
| 重合率（重合 / 考研词库） | **71.4%** |
| vocab.json 覆盖率（重合 / 5011） | **72.0%** |
| 新增词数（考研词库有、vocab.json 无） | **1447** |

交集按 `word` 精确匹配（区分大小写）；大小写不敏感口径下重合数相同（3610）。

### 新增词样例 10 个

`April, Bible, Catholic, Christ, Christian, Easter, Latin, March, Marxist, Monday`
（码元序前 10，恰为大写专有名词；中段普通词样例：
`longitude, loom, lorry, lottery, loudspeaker, lounge, lubricate, lumber, lure, lyric`）

## 已知源数据瑕疵（原样透传，不做修饰）

- KaoYan_1 的 `March` 源数据本身损坏：一条释义被拆成
  `"三月(略作"`（pos `n`）与 `")"`（pos `Mar`）两条，拼接结果为
  `tran: "三月(略作；)"`、`pos: "n/Mar"`。属上游数据问题，按"逐条可溯源、
  不编造"原则原样保留。
- 少数非标准词性取值（`v&n` 19 条、`n&v` 8 条、`Mar` 1 条等）原样保留。

## 管线与测试

- 构建脚本：`scripts/build-kaoyan.ts`（`npm run build:kaoyan`，幂等，可重复运行）
- 纯函数层：`scripts/lib/kaoyan.ts`（解析 / 归一化 / 去重 / 排序 / 交集统计，无 IO）
- 单元测试：`scripts/lib/__tests__/kaoyan.test.ts`（内联小型 fixture，不依赖网络与 .cache）
- `.cache/` 已加入 `.gitignore`，源文件不入库
