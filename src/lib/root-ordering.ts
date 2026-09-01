// src/lib/root-ordering.ts
// 词根排列 v2：569 个词根的确定性全序。
// 设计目标（第二版需求）：意思相关联的词根成线（语义主题连续区段）、
// 主题间有教学递进顺序、组内高产词根靠前、易混词根不得相邻。
// 纯运行时计算，不改动数据文件；无随机、无时间依赖，同输入恒同输出。

import type { MindMapData, EnhancedRootNode } from './mindmap-types'
import { CONFUSABLE_ROOTS } from './confusables'

export interface ThemeDef {
  key: string
  label: string
  /** 词义词素子串匹配（命中任一即归入该主题） */
  keywords: string[]
  /** 个别噪声词义无法用子串表达（如单字「不」），用全等兜底 */
  exactMeanings?: string[]
}

/**
 * 主题按教学递进排序：先词缀语法功能，再由具体动作 → 感知言语 → 心智情感，
 * 到结构/分离/连接等构词框架，再到数量价值法律等抽象域，最后自然社会。
 * 关键词表基于 enhanced-roots.json 全量词义的实证分布整理。
 */
export const THEMES: ThemeDef[] = [
  { key: 'affix', label: '词缀功能', keywords: ['性质', '能力', '能干', '额外', '相关', '存在', '行为', '朝向', '缺席', '根据', '输入'], exactMeanings: ['不', '当...时', '这', '但是', '甚至', '因此', '尽管', '显然'] },
  { key: 'build', label: '建造结构', keywords: ['建造', '建立', '构造', '建筑', '建筑师', '结构', '基础', '建设', '柱'] },
  { key: 'action', label: '手作行动', keywords: ['做', '行动', '劳动', '制作', '制造', '操作', '修理', '创造', '技艺', '尝试', '滥用', '从事', '利用', '部署', '机械', '技术', '训练', '打猎', '工作'] },
  { key: 'hold', label: '持取拥有', keywords: ['拿', '持有', '保持', '拥有', '所有', '含有', '容纳', '放置', '握', '固定', '包装', '获得'] },
  { key: 'move', label: '移动运送', keywords: ['走', '来', '移动', '携带', '运送', '引导', '发送', '派遣', '递送', '船', '航行', '爬', '注射', '步', '移民', '旅游', '撤退', '跟随', '下降', '举起', '返回', '自行车'] },
  { key: 'pushpull', label: '推拉投掷', keywords: ['推', '拉', '投掷', '按压', '抛', '倾倒'] },
  { key: 'lum', label: '光色明暗', keywords: ['光', '星', '雷', '闪', '照片', '黑暗'] },
  { key: 'sight', label: '感知视觉', keywords: ['看', '视', '观', '显现', '出现', '展示', '预见', '展览'] },
  { key: 'speech', label: '听说言语', keywords: ['听', '声音', '喊', '叫', '宣布', '说', '言', '话', '讲', '告诉', '承认', '口音', '警告', '批评', '抱怨', '描述', '供认', '评论', '交流', '谈判', '忠告', '沉默', '背书'] },
  { key: 'mind', label: '思想认知', keywords: ['知道', '记忆', '思', '智', '相信', '信任', '证明', '清楚', '寻求', '选择', '咨询', '符合', '真实', '确定', '原因', '适合', '注意', '构想', '伸展', '事实', '意味着', '假设', '结论', '怀疑', '本质', '评估', '熟悉', '习惯', '历史', '已知', '潜在', '学习', '启发', '方法', '秘密', '研究', '解决', '洞察', '检测', '解释', '调查', '信念', '同意', '因为', '信仰', '判断'] },
  { key: 'emotion', label: '情感态度', keywords: ['感觉', '情感', '感情', '关心', '爱', '惧', '害怕', '勇气', '惊奇', '敬畏', '羞耻', '高兴', '取悦', '享受', '绝望', '希望', '缪斯', '艺术', '庆祝', '喜欢', '烦', '抑郁', '愉快', '尴尬', '失败', '成功', '恩惠', '幸运', '沮丧', '优雅', '快乐', '荣誉', '愤怒', '热情', '宽容', '亲密', '娱乐', '理想', '意愿', '意志', '失望', '谨慎', '性格', '音乐', '奉献'] },
  { key: 'break', label: '断裂分离', keywords: ['破裂', '切', '割', '分开', '关闭', '停止', '打开', '解开', '摧毁', '混乱'] },
  { key: 'connect', label: '连接结合', keywords: ['折叠', '粘附', '加入', '连', '绑', '钉', '整合', '聚集', '插入'] },
  { key: 'quantity', label: '数量程度', keywords: ['数量', '部分', '全部', '整个', '相等', '相同', '增加', '堆积', '添加', '补充', '多', '少', '大', '小', '半', '差异', '不同', '区别', '细节', '有限', '可能', '必要', '丰富', '范围', '测量', '计算', '比较', '复杂', '第一', '第二', '短', '更好', '寻常', '有效', '主要', '明显', '合格', '十亿'], exactMeanings: ['空', '好的', '每'] },
  { key: 'value', label: '价值交换', keywords: ['价值', '支付', '钱', '账户', '银行', '费用', '买卖', '利益', '贡献', '房产', '收费', '捐赠', '租', '基金', '商品', '市场', '投资', '效用', '节约'] },
  { key: 'law', label: '法律秩序', keywords: ['法律', '规则', '规范', '法则', '秩序', '顺序', '排列', '命令', '正确', '公正', '审判', '统治', '违反', '监禁', '约束', '限制', '义务', '责任', '惩罚', '定罪', '腐败', '宪法', '官方', '民事', '囚犯'] },
  { key: 'life', label: '生命生长', keywords: ['生命', '生活', '出生', '产生', '生长', '成长', '耕种', '年龄', '活力', '细胞', '植物', '农场'] },
  { key: 'death', label: '死亡结束', keywords: ['死', '结束', '终止'] },
  { key: 'spacetime', label: '时空方位', keywords: ['地方', '位置', '时间', '前', '后', '内', '外', '路', '远', '近', '岸', '地址', '指南针', '截止', '等待', '立即', '消失', '下方', '居住', '延迟', '角落', '入口', '郊区', '夜晚'], exactMeanings: ['家'] },
  { key: 'shape', label: '形状状态', keywords: ['形状', '直', '弯', '紧', '松', '球', '线', '点', '平', '悬挂', '围绕', '扭曲'] },
  { key: 'force', label: '强弱力量', keywords: ['强', '坚固', '持久', '武器', '打击', '力量', '战斗', '保护', '重', '危险', '击败', '对抗', '损害', '保卫', '硬', '伤害', '操纵', '抑制', '权力', '弱', '压倒', '守卫', '好战', '征服'] },
  { key: 'nature', label: '自然物质', keywords: ['水', '土地', '土', '波浪', '海洋', '海滩', '空气', '天地', '流动', '野兽', '鱼', '毛皮', '地面', '元素', '电', '循环', '资源', '老鼠'] },
  { key: 'body', label: '身心肢体', keywords: ['手', '心', '呼吸', '触摸', '坐', '睡', '醒', '身体', '头', '眼', '关节', '摄入', '站立', '器官', '代谢', '临床', '疾病', '医院', '生病', '疼痛', '毒药', '躺', '脚'] },
  { key: 'society', label: '社会关系', keywords: ['服务', '同伴', '公众', '流行', '社会', '其他', '两者', '相似', '自己', '自我', '自由', '盟', '公司', '合作', '独自', '学院', '教育', '教', '班级', '雇用', '妥协', '参与', '互动', '面试', '领导', '帮助', '名声', '时尚', '朋友', '工程', '主人', '人类', '国王', '同事', '社区', '国家', '国际', '学者', '代表', '退休', '课程', '公民', '种族', '招聘', '工业', '遇见', '妈妈', '互联网'] },
  { key: 'change', label: '变化转化', keywords: ['转', '变化', '成为', '激活', '升起', '恢复', '发展', '实现', '启动', '恶化', '变量', '改变', '新'] },
  { key: 'mark', label: '文书标记', keywords: ['标记', '写', '记录', '符号', '文字', '名称', '引用', '注册', '版本', '编辑', '文件', '图表', '笔', '描绘', '编译', '画', '绘画', '期刊', '上下文'] },
]

export const OTHER_THEME: ThemeDef = { key: 'other', label: '其他', keywords: [] }

/** 首个命中主题（按 THEMES 顺序，先词缀后实义，保证「ition:行为」这类伪词根进词缀组） */
export function assignTheme(root: EnhancedRootNode): ThemeDef {
  const meaning = root.meaning
  for (const theme of THEMES) {
    if (theme.exactMeanings?.some((m) => meaning === m)) return theme
    if (theme.keywords.some((k) => meaning.includes(k))) return theme
  }
  return OTHER_THEME
}

/** 易混词根对的无向集合（primaryText 归一为 a|b） */
const confusablePairs = new Set<string>(
  Object.entries(CONFUSABLE_ROOTS).flatMap(([from, entries]) =>
    entries.map((e) => [from, e.text].sort().join('|'))
  )
)

function isConfusable(a: string, b: string): boolean {
  return confusablePairs.has([a, b].sort().join('|'))
}

/** 组内排序：高产（关联词多）优先，文本序兜底保证确定性 */
function byProductiveness(a: EnhancedRootNode, b: EnhancedRootNode): number {
  if (a.wordCount !== b.wordCount) return b.wordCount - a.wordCount
  return a.primaryText.localeCompare(b.primaryText)
}

/**
 * 易混错开：同组内相邻易混对，尝试与后面最近的可行元素交换。
 * 交换需同时满足：不引入新的易混相邻（交换元素与其两侧新邻居）。
 * 找不到可行交换时保留原状，记录到 unfixable 供测试断言。
 */
function spreadConfusables(group: EnhancedRootNode[]): {
  arr: EnhancedRootNode[]
  unfixable: [string, string][]
} {
  const arr = [...group]
  const unfixable: [string, string][] = []
  for (let i = 1; i < arr.length; i++) {
    if (!isConfusable(arr[i - 1].primaryText, arr[i].primaryText)) continue
    let fixed = false
    for (let j = i + 1; j < arr.length; j++) {
      const cand = arr[j]
      if (isConfusable(arr[i - 1].primaryText, cand.primaryText)) continue
      if (i + 1 < arr.length && i + 1 !== j && isConfusable(cand.primaryText, arr[i + 1].primaryText)) continue
      if (j + 1 < arr.length && isConfusable(arr[i].primaryText, arr[j + 1].primaryText)) continue
      if (j > i + 1 && isConfusable(arr[i].primaryText, arr[j - 1].primaryText)) continue
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      fixed = true
      break
    }
    if (!fixed) unfixable.push([arr[i - 1].primaryText, arr[i].primaryText])
  }
  // 单组内多对易混同时出现的概率极低，单轮扫描足够
  return { arr, unfixable }
}

/** 诊断：全量排序后仍相邻的易混对（测试用，理想为空数组） */
export function findUnfixableConfusables(roots: EnhancedRootNode[]): [string, string][] {
  const buckets = new Map<string, EnhancedRootNode[]>()
  for (const theme of [...THEMES, OTHER_THEME]) buckets.set(theme.key, [])
  for (const root of roots) buckets.get(assignTheme(root).key)!.push(root)
  const unfixable: [string, string][] = []
  for (const theme of [...THEMES, OTHER_THEME]) {
    unfixable.push(...spreadConfusables(buckets.get(theme.key)!.sort(byProductiveness)).unfixable)
  }
  return unfixable
}

/**
 * 全序：主题按 THEMES 顺序成连续区段，「其他」垫尾；
 * 组内高产优先；最后做易混错开。
 */
export function orderRoots(roots: EnhancedRootNode[]): EnhancedRootNode[] {
  const buckets = new Map<string, EnhancedRootNode[]>()
  for (const theme of [...THEMES, OTHER_THEME]) buckets.set(theme.key, [])
  for (const root of roots) {
    buckets.get(assignTheme(root).key)!.push(root)
  }
  const ordered: EnhancedRootNode[] = []
  for (const theme of [...THEMES, OTHER_THEME]) {
    const group = buckets.get(theme.key)!.sort(byProductiveness)
    ordered.push(...spreadConfusables(group).arr)
  }
  return ordered
}

/** 数据全量排序（roots 页云与后续消费方使用） */
export function getOrderedRoots(data: MindMapData): EnhancedRootNode[] {
  return orderRoots(data.roots)
}
