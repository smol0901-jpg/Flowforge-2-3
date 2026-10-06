/* FlowForge · actions/share — ссылка на схему прямо в URL (deflate + base64url), без сервера */
const b64u = u => { let s = ''; u.forEach(c => s += String.fromCharCode(c)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };

/** JSON → '#d=...' (сжатие) или '#j=...' (без него) */
export async function pack(t) {
  const u = new TextEncoder().encode(t);
  if (window.CompressionStream) {
    const s = new Blob([u]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    return 'd=' + b64u(new Uint8Array(await new Response(s).arrayBuffer()));
  }
  return 'j=' + b64u(u);
}

/** '#d=..' | '#j=..' → JSON-строка (или null) */
export async function unpack(h) {
  const m = String(h || '').match(/^#?([dj])=(.+)$/);
  if (!m) return null;
  const u = unb64u(m[2]);
  if (m[1] === 'j') return new TextDecoder().decode(u);
  if (!window.DecompressionStream) throw new Error('Браузер не поддерживает распаковку');
  const s = new Blob([u]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new TextDecoder().decode(await new Response(s).arrayBuffer());
}

/** Собрать ссылку для текущей сериализации схемы */
export async function shareUrl(serStr) {
  return location.href.split('#')[0] + '#' + await pack(serStr);
}
