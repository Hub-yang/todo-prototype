# .docs 索引

叙述性内容都放在这里：架构综述、决策与选型、进度、走查报告、历史归档。
约束性内容（现役禁令、隐式契约、踩过的坑）留在根目录的 [`CLAUDE.md`](../CLAUDE.md)，每轮常驻。

判据是时态：**写不成「现在要/不要做什么」的句子，就该放在这里。**

| 文档 | 什么时候读 |
|---|---|
| [`architecture.md`](architecture.md) | 动 `src/core/` 的接口、加新的图操作、或想知道某个目录归谁管时 |
| [`decisions.md`](decisions.md) | 想推翻某个既定做法之前（主题数量、不做 GIF、导出走 paper…），以及二/三期立项时 |
| [`progress.md`](progress.md) | 接手一个新会话、想知道「现在到哪了、还欠什么」时 |
| [`reviews/`](reviews/) | 改画布几何（布局行高、边标签位置、浮层让位）之前，以及做浏览器验证之前 |
| [`archive/`](archive/) | 只在综述答不上来、需要翻当时的逐任务细节时 |

## 新产物往哪写

superpowers 技能默认把 spec 与实现计划写到 `docs/superpowers/specs|plans/`。
**本项目不用那个路径**：新的 spec 写 `.docs/specs/`，新的实现计划写 `.docs/plans/`，
走查报告写 `.docs/reviews/`。根目录不要再出现 `docs/`。

## 关于 archive/

三份原文按「归档」处理，不做修订，因此其中引用的 `docs/superpowers/...` 路径是迁移前的旧路径，
现已全部位于 `.docs/archive/` 与 `.docs/reviews/`。它们记录的是当时的排期、逐任务步骤与验收清单，
其中仍然有效的结论已经提炼进上面三份综述。
