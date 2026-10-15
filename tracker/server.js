// Headache tracker server. No npm dependencies (needs Node 18+).
// Env: PORT (8082), DATA_DIR (./data, a git clone of the PRIVATE data repo), ALLOW_NO_AUTH=1 (testing only)
const http = require('http'), fs = require('fs'), path = require('path');
const { execFile } = require('child_process');

const PORT = +process.env.PORT || 8082;
const DATA = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const PUB = path.join(__dirname, 'public');
const LAT = 40.2518, LON = -111.6493; // BYU campus, Provo UT
const TZ = 'America/Denver';
const EF = path.join(DATA, 'entries.json'), PF = path.join(DATA, 'pressure.csv'), CF = path.join(DATA, 'entries.csv');
fs.mkdirSync(DATA, { recursive: true });

const rd = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
let entries = rd(EF, []);
let weather = {}; // 'YYYY-MM-DDTHH:00' -> {hpa, rh, temp}
try {
  fs.readFileSync(PF, 'utf8').split('\n').slice(1).filter(Boolean).forEach(l => {
    const [t, p, r, c] = l.split(','); weather[t] = { hpa: +p, rh: +r, temp: +c };
  });
} catch {}

const nowLocal = () => new Date().toLocaleString('sv', { timeZone: TZ }).replace(' ', 'T').slice(0, 16);
const shift = (t, h) => new Date(t.slice(0, 13) + ':00:00Z').getTime() + h * 3600e3;
const key = ms => new Date(ms).toISOString().slice(0, 13) + ':00';
function pressureAt(at) {
  const k = at.slice(0, 13) + ':00', w = weather[k];
  if (!w) return null;
  const p3 = weather[key(shift(k, -3))], p24 = weather[key(shift(k, -24))];
  return { hpa: w.hpa, rh: w.rh, temp: w.temp,
    d3: p3 ? +(w.hpa - p3.hpa).toFixed(1) : '', d24: p24 ? +(w.hpa - p24.hpa).toFixed(1) : '' };
}

// ---- pressure logger: hourly, merges last 2 days so downtime self-heals
async function logWeather() {
  try {
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
      `&hourly=surface_pressure,relative_humidity_2m,temperature_2m&past_days=2&forecast_days=1&timezone=${encodeURIComponent(TZ)}`;
    const j = await (await fetch(u)).json(), h = j.hourly, now = nowLocal();
    h.time.forEach((t, i) => { if (t <= now && h.surface_pressure[i] != null)
      weather[t] = { hpa: h.surface_pressure[i], rh: h.relative_humidity_2m[i], temp: h.temperature_2m[i] }; });
    const rows = Object.keys(weather).sort().map(t => `${t},${weather[t].hpa},${weather[t].rh},${weather[t].temp}`);
    fs.writeFileSync(PF, 'time,pressure_hpa,humidity_pct,temp_c\n' + rows.join('\n') + '\n');
    sync('pressure update');
  } catch (e) { console.error('weather fetch failed:', e.message); }
}
setInterval(logWeather, 3600e3); logWeather();

// ---- storage + git sync (debounced) to the private data repo
const COLS = ['id','date','at','sev','start','dur','loc','feel','aura','diz','ear','tin','oth','sinus','trig','meals','caf','slp','wat','meds','note','hpa','d3_hpa','d24_hpa','humidity','temp_c'];
const q = v => { v = Array.isArray(v) ? v.join('; ') : (v ?? ''); return /[",\n]/.test(v) ? '"' + String(v).replace(/"/g, '""') + '"' : v; };
function save() {
  fs.writeFileSync(EF, JSON.stringify(entries, null, 1));
  const rows = entries.slice().sort((a, b) => a.at < b.at ? -1 : 1).map(e => COLS.map(c => q(
    c === 'hpa' ? e.p?.hpa : c === 'd3_hpa' ? e.p?.d3 : c === 'd24_hpa' ? e.p?.d24 :
    c === 'humidity' ? e.p?.rh : c === 'temp_c' ? e.p?.temp : e[c])).join(','));
  fs.writeFileSync(CF, COLS.join(',') + '\n' + rows.join('\n') + '\n');
  sync('diary update');
}
let timer;
function sync(msg) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const git = (...a) => new Promise(r => execFile('git', a, { cwd: DATA }, (e, o, s) => r({ e, s })));
    (async () => {
      if (!fs.existsSync(path.join(DATA, '.git'))) return;
      await git('add', '-A');
      const c = await git('commit', '-m', msg);
      if (c.e && !/nothing to commit/.test(String(c.e) + c.s)) return console.error('git commit:', c.s);
      const p = await git('push');
      if (p.e) console.error('git push failed:', p.s);
    })();
  }, 5000);
}

// ---- http
const send = (res, code, body, type = 'application/json') => { res.writeHead(code, { 'Content-Type': type }); res.end(Buffer.isBuffer(body) || typeof body === 'string' ? body : JSON.stringify(body)); };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
http.createServer((req, res) => {
  // Fail closed: Cloudflare Access sets this header after login. Direct access without it is refused.
  if (!process.env.ALLOW_NO_AUTH && !req.headers['cf-access-authenticated-user-email']) return send(res, 401, { error: 'login required' });
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/entries' && req.method === 'GET') return send(res, 200, entries);
  if (url.pathname === '/entries.csv') return send(res, 200, fs.existsSync(CF) ? fs.readFileSync(CF) : '', 'text/csv');
  if (url.pathname === '/api/status') return send(res, 200, { now: nowLocal(), pressure: pressureAt(nowLocal()) });
  if (url.pathname === '/api/entries' && req.method === 'POST') {
    let b = ''; req.on('data', d => { b += d; if (b.length > 1e5) req.destroy(); });
    return req.on('end', () => {
      try {
        const e = JSON.parse(b);
        e.id = Date.now(); e.at = (e.at || nowLocal()).slice(0, 16); e.p = pressureAt(e.at);
        entries.push(e); save(); send(res, 200, e);
      } catch { send(res, 400, { error: 'bad entry' }); }
    });
  }
  if (url.pathname === '/api/health' && req.method === 'POST') { // placeholder for watch data (Health Auto Export / Shortcuts)
    let b = ''; req.on('data', d => b += d);
    return req.on('end', () => { fs.appendFileSync(path.join(DATA, 'health-inbox.jsonl'), b.replace(/\n/g, ' ') + '\n'); sync('health data'); send(res, 200, { ok: 1 }); });
  }
  const m = url.pathname.match(/^\/api\/entries\/(\d+)$/);
  if (m && req.method === 'DELETE') { entries = entries.filter(e => e.id !== +m[1]); save(); return send(res, 200, { ok: 1 }); }
  // static
  let f = path.join(PUB, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return send(res, 404, 'not found', 'text/plain');
  send(res, 200, fs.readFileSync(f), MIME[path.extname(f)] || 'application/octet-stream');
}).listen(PORT, '127.0.0.1', () => console.log('tracker on 127.0.0.1:' + PORT));
