/* FlowForge · actions/mermaid — экспорт текущей схемы в Mermaid flowchart */
import { nodes, edges, groups, N } from '../core/state.js';

const SH = {
  terminal: ['(["', '"])'], process: ['["', '"]'], decision: ['{"', '"}'], io: ['[/"', '"/]'],
  data: ['[("', '")]'], sub: ['[["', '"]]'], note: ['["', '"]'], doc: ['["', '"]'],
  prep: ['{{"', '"}}'], conn: ['(("', '"))'], manual: ['[/"', '"\\]']
};

const q = s => String(s).replace(/"/g, "'").replace(/\n/g, '<br/>');

export function toMermaid() {
  const ids = new Map(nodes().map((n, i) => [n.id, 'N' + (i + 1)]));
  const decl = n => { const sh = SH[n.type] || SH.process; return `${ids.get(n.id)}${sh[0]}${q(n.text)}${sh[1]}` };
  const inG = new Set(groups().flatMap(g => g.nodes));
  let o = 'flowchart TD\n';
  nodes().filter(n => !inG.has(n.id)).forEach(n => o += '  ' + decl(n) + '\n');
  groups().forEach((g, i) => {
    o += `  subgraph G${i + 1}["${q(g.title)}"]\n`;
    g.nodes.map(N).filter(Boolean).forEach(n => o += '    ' + decl(n) + '\n');
    o += '  end\n';
  });
  edges().forEach(e => {
    const ar = e.arrow === 'none' ? '---' : e.arrow === 'both' ? '<-->' : (e.dash && e.dash !== 'solid') ? '-.->' : (e.width >= 4 ? '==>' : '-->');
    o += `  ${ids.get(e.from)} ${ar}${e.label ? `|"${q(e.label)}"|` : ''} ${ids.get(e.to)}\n`;
  });
  return o;
}
