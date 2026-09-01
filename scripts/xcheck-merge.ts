// scripts/xcheck-merge.ts
//
// 运行器：合并三路词源校验分报告 → public/data/xcheck-report.json
//
// 用法：npx tsx scripts/xcheck-merge.ts
// 输入：public/data/xcheck-{etymwn,wiktionary,etymonline}.json（三路运行器产物，同构）
// 合并规则见 scripts/lib/xcheck-merge.ts 头注释。确定性：同输入重跑输出一致。

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { mergeReports, type SourcePartialReport } from './lib/xcheck-merge'

const DATA_DIR = join(process.cwd(), 'public', 'data')
const OUT_FILE = join(DATA_DIR, 'xcheck-report.json')
const PARTIALS = ['xcheck-etymwn.json', 'xcheck-wiktionary.json', 'xcheck-etymonline.json'] as const

async function main(): Promise<void> {
  const t0 = Date.now()
  const partials: SourcePartialReport[] = PARTIALS.map((name) => {
    const raw = readFileSync(join(DATA_DIR, name), 'utf-8')
    return JSON.parse(raw) as SourcePartialReport
  })

  const report = mergeReports(partials)
  writeFileSync(OUT_FILE, JSON.stringify(report, null, 2) + '\n', 'utf-8')

  const s = report.summary
  console.log(`[xcheck-merge] roots=${s.rootTotal} confirmed=${s.confirmed} not_found=${s.notFound} conflict=${s.conflict}`)
  for (const row of s.layerBreakdown) {
    console.log(`[xcheck-merge]   ${row.layer}: confirmed=${row.confirmed} not_found=${row.notFound} conflict=${row.conflict}`)
  }
  console.log(`[xcheck-merge] words verdicts: match=${s.verdicts.match} mismatch=${s.verdicts.mismatch} unverified=${s.verdicts.unverified} (checked=${s.wordsChecked})`)
  console.log(`[xcheck-merge] sources ok: ${report.sourceStatus.map((x) => `${x.id}=${x.ok}`).join(' ')}`)
  console.log(`[xcheck-merge] written: ${OUT_FILE} elapsed=${((Date.now() - t0) / 1000).toFixed(1)}s`)
}

main().catch((err) => {
  console.error('[xcheck-merge] failed:', err)
  process.exit(1)
})
