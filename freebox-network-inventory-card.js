/**
 * Freebox Network Inventory Card
 * Style inspiré de tplink-router-card
 */

const VERSION = '2.13.0';
const DOMAIN  = 'freebox_network_inventory';
const PAGE_DEF = 10;

const GLOBAL_KEYS = new Set([
  `sensor.${DOMAIN}_devices_online`,
  `sensor.${DOMAIN}_devices_total`,
  `sensor.${DOMAIN}_devices_new`,
  `sensor.${DOMAIN}_static_leases`,
]);
const LEASES_EID = `sensor.${DOMAIN}_static_leases`;

const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

const DEVICE_ICONS = [
  { icon: 'mdi:television',      kw: ['téléviseur','television','tv'] },
  { icon: 'mdi:cellphone',       kw: ['smartphone','telephone','mobile','iphone','android','redmi','galaxy','pixel'] },
  { icon: 'mdi:laptop',          kw: ['ordinateur portable','laptop','macbook','thinkpad','notebook'] },
  { icon: 'mdi:desktop-tower',   kw: ['ordinateur','desktop','imac','workstation','pc'] },
  { icon: 'mdi:tablet',          kw: ['tablette','tablet','ipad','kindle'] },
  { icon: 'mdi:printer',         kw: ['imprimante','printer','canon','epson','brother'] },
  { icon: 'mdi:router-network',  kw: ['équipement réseau','router','freebox','bbox','livebox','deco','borne wifi'] },
  { icon: 'mdi:nas',             kw: ['nas / serveur','nas','synology','qnap','jellyfin','proxmox'] },
  { icon: 'mdi:cctv',            kw: ['caméra ip','camera','cam'] },
  { icon: 'mdi:gamepad-variant', kw: ['console de jeu','playstation','xbox','nintendo'] },
  { icon: 'mdi:lightbulb',       kw: ['éclairage connecté','bulb','yeelight','hue','tuya'] },
  { icon: 'mdi:thermostat',      kw: ['thermostat / clim','thermostat','clim'] },
  { icon: 'mdi:multimedia',      kw: ['multimédia','multimedia'] },
  { icon: 'mdi:cpu-32-bit',      kw: ['esp','arduino','raspberry'] },
  { icon: 'mdi:speaker',         kw: ['sonos','echo','homepod','bose','speaker'] },
];

function guessIcon(hostType='', name='', vendor='') {
  const s = (hostType+' '+name+' '+vendor).toLowerCase();
  for (const {icon,kw} of DEVICE_ICONS) if (kw.some(w=>s.includes(w))) return icon;
  return 'mdi:devices';
}

function relativeTime(iso) {
  if (!iso || iso==='unknown' || iso==='unavailable') return null;
  try {
    const d=new Date(iso), diff=Math.floor((Date.now()-d.getTime())/1000);
    let rel;
    if (diff<0)          rel='À l\'instant';
    else if (diff<60)    rel=`${diff} s`;
    else if (diff<3600)  rel=`${Math.floor(diff/60)} min`;
    else if (diff<86400) rel=`${Math.floor(diff/3600)} h`;
    else                 rel=`${Math.floor(diff/86400)} j`;
    const fmt=d.toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
    return `${rel} (${fmt})`;
  } catch { return null; }
}

function relShort(iso) {
  if (!iso) return '—';
  try {
    const diff=Math.floor((Date.now()-new Date(iso).getTime())/1000);
    if (diff<0)          return 'À l\'instant';
    if (diff<60)         return `${diff} s`;
    if (diff<3600)       return `${Math.floor(diff/60)} min`;
    if (diff<86400)      return `${Math.floor(diff/3600)} h`;
    return `${Math.floor(diff/86400)} j`;
  } catch { return '—'; }
}

const STYLES = `
  :host { display: block; font-family: var(--primary-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif); }

  /* ── Card shell ── */
  .card {
    border-radius: var(--ha-card-border-radius, 12px);
    background: var(--card-background-color, #fff);
    box-shadow: var(--ha-card-box-shadow);
    overflow: hidden;
  }

  /* ── Header (style tplink : fond gris très clair, titre bold) ── */
  .card-header {
    padding: 16px 20px 10px;
    background: linear-gradient(135deg, rgba(30, 60, 90, 0.18), rgba(0, 0, 0, 0));
    border-bottom: 1px solid var(--divider-color, #e0e0e0);
  }
  .card-header .main-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--primary-text-color);
    margin-bottom: 2px;
  }
  .card-header .subtitle {
    font-size: 12px;
    color: var(--secondary-text-color);
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  }
  .subtitle .count-badge {
    background: var(--secondary-background-color);
    border-radius: 99px;
    padding: 2px 10px;
    font-size: 12px;
    color: var(--secondary-text-color);
    border: 1px solid var(--divider-color);
  }
  .subtitle .count-badge b { font-weight: 600; color: var(--primary-text-color); }

  /* ── Toolbar : barre de recherche large ── */
  .toolbar {
    padding: 10px 16px;
    display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
    border-bottom: 1px solid var(--divider-color);
    background: linear-gradient(135deg, rgba(30, 60, 90, 0.08), rgba(0, 0, 0, 0));
  }
  .search-wrap {
    flex: 1; min-width: 200px;
    position: relative;
  }
  .search-icon {
    position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
    --mdi-icon-size: 16px; color: var(--secondary-text-color); pointer-events: none;
  }
  .search {
    width: 100%; height: 36px;
    padding: 0 12px 0 34px;
    font-size: 13px;
    border: 1px solid var(--divider-color);
    border-radius: 99px;
    background: var(--secondary-background-color);
    color: var(--primary-text-color);
    outline: none;
    font-family: inherit;
    box-sizing: border-box;
  }
  .search:focus { border-color: var(--primary-color); background: var(--card-background-color); }
  .search::placeholder { color: var(--secondary-text-color); opacity: .7; }

  /* ── Filtres style pill ── */
  .filter-group {
    display: flex; gap: 4px; align-items: center;
    background: var(--secondary-background-color);
    border-radius: 99px;
    padding: 3px;
    border: 1px solid var(--divider-color);
  }
  .fbtn {
    height: 28px; padding: 0 14px;
    font-size: 12px; font-weight: 500;
    border: none; border-radius: 99px;
    background: transparent;
    cursor: pointer;
    color: var(--secondary-text-color);
    font-family: inherit;
    transition: all .15s;
    white-space: nowrap;
  }
  .fbtn.active {
    background: var(--primary-color);
    color: white;
    box-shadow: 0 1px 4px rgba(0,0,0,.2);
  }

  /* ── Tableau ── */
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  thead tr {
    border-bottom: 2px solid var(--divider-color);
  }
  th {
    padding: 9px 14px;
    text-align: left;
    font-weight: 700;
    font-size: 12px;
    color: var(--primary-text-color);
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
    letter-spacing: .02em;
  }
  th .sa { opacity: .3; font-size: 10px; margin-left: 3px; }
  th.sorted { color: var(--primary-color); }
  th.sorted .sa { opacity: 1; }
  tbody tr {
    border-bottom: 1px solid var(--divider-color);
    transition: background .1s;
  }
  tbody tr:hover { background: var(--secondary-background-color); }
  tbody tr:last-child { border-bottom: none; }
  td { padding: 8px 14px; vertical-align: middle; }

  /* ── Icône appareil ── */
  .dico {
    width: 28px; height: 28px; border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    background: var(--secondary-background-color);
    border: 1px solid var(--divider-color);
    flex-shrink: 0;
  }
  .dico ha-icon { --mdi-icon-size: 16px; color: var(--primary-color); }

  /* ── Cellule nom (style tplink : bleu, cliquable) ── */
  .dev-name {
    color: var(--primary-color);
    font-weight: 500;
    cursor: pointer;
    font-size: 13px;
    white-space: nowrap;
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
  }
  .dev-name:hover { text-decoration: underline; opacity: .85; }
  .dev-mac { font-size: 11px; color: var(--secondary-text-color); font-family: monospace; margin-top: 1px; }

  /* ── Statut (point + texte gras comme tplink) ── */
  .status-cell { display: flex; align-items: center; gap: 5px; white-space: nowrap; }
  .status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .status-dot.on  { background: #2ed47a; box-shadow: 0 0 0 2px rgba(46,212,122,.2); }
  .status-dot.off { background: var(--disabled-text-color, #bbb); }
  .status-text { font-weight: 700; font-size: 12px; }
  .status-text.on  { color: #1a9e58; }
  .status-text.off { color: var(--secondary-text-color); }

  /* ── IP / textes monospace ── */
  .mono { font-family: monospace; font-size: 12px; color: var(--secondary-text-color); }
  .dash { color: var(--disabled-text-color); }

  /* ── Type badge (style tplink : pill outline) ── */
  .type-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 10px;
    border-radius: 99px;
    font-size: 11px; font-weight: 500;
    border: 1.5px solid;
    white-space: nowrap;
  }
  .type-badge.good   { border-color: #2ed47a; color: #1a9e58; background: rgba(46,212,122,.08); }
  .type-badge.neutral{ border-color: var(--divider-color); color: var(--secondary-text-color); background: transparent; }

  /* ── Persistant / bail statique ── */
  .yes  { color: #1a9e58; font-weight: 700; font-size: 12px; }
  .ip-cell { display: inline-flex; align-items: center; gap: 4px; }
  .lease-ico { --mdi-icon-size: 13px; color: var(--primary-color); }
  .lease-mismatch { color: #e0a000; }
  .pedit-btn.danger { background: transparent; color: var(--error-color, #db4437); border-color: var(--error-color, #db4437); }
  .pfield > .pedit-input { flex: none; }
  .pedit-hint { font-size: 11px; color: var(--secondary-text-color); margin-top: 2px; }
  .pedit-err  { font-size: 11px; color: var(--error-color, #db4437); margin-top: 2px; min-height: 14px; }

  /* ── Vendor ── */
  .vendor-text { font-size: 12px; color: var(--secondary-text-color); max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* ── Vu ── */
  .seen-text { font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; }

  /* ── Empty ── */
  .empty { padding: 40px; text-align: center; color: var(--secondary-text-color); font-size: 13px; }

  /* ── Pagination ── */
  .pagination {
    padding: 8px 16px;
    display: flex; align-items: center; justify-content: space-between;
    border-top: 1px solid var(--divider-color);
    font-size: 12px; color: var(--secondary-text-color);
  }
  .pbtns { display: flex; gap: 4px; }
  .pbtn {
    width: 28px; height: 28px;
    border: 1px solid var(--divider-color);
    border-radius: 6px;
    background: transparent; cursor: pointer;
    color: var(--secondary-text-color);
    font-size: 15px; font-family: inherit;
    display: flex; align-items: center; justify-content: center;
    transition: background .1s;
  }
  .pbtn:hover:not(:disabled) { background: var(--secondary-background-color); }
  .pbtn:disabled { opacity: .3; cursor: default; }

  /* ── Modal popup ── */
  .overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,.45);
    z-index: 9998;
    display: flex; align-items: center; justify-content: center;
    padding: 16px;
    backdrop-filter: blur(2px);
  }
  .overlay.hidden { display: none; }
  .popup {
    background: var(--card-background-color);
    border-radius: 14px;
    box-shadow: 0 12px 40px rgba(0,0,0,.25);
    width: 100%; max-width: 540px; max-height: 88vh;
    display: flex; flex-direction: column; overflow: hidden;
  }
  .popup-header {
    display: flex; align-items: center; gap: 12px;
    padding: 16px 18px;
    border-bottom: 1px solid var(--divider-color);
    flex-shrink: 0;
    background: var(--secondary-background-color);
  }
  .popup-icon {
    width: 40px; height: 40px; border-radius: 10px;
    background: var(--card-background-color);
    border: 1px solid var(--divider-color);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .popup-icon ha-icon { --mdi-icon-size: 22px; color: var(--primary-color); }
  .popup-title { flex: 1; }
  .popup-title .pname { font-size: 16px; font-weight: 700; color: var(--primary-text-color); }
  .popup-title .pmac  { font-size: 11px; color: var(--secondary-text-color); font-family: monospace; margin-top: 1px; }
  .popup-status { display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; }
  .popup-status.online  { color: #1a9e58; }
  .popup-status.offline { color: var(--secondary-text-color); }
  .popup-close {
    width: 32px; height: 32px; border: none;
    background: var(--card-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 50%; cursor: pointer;
    font-size: 16px; color: var(--secondary-text-color);
    display: flex; align-items: center; justify-content: center;
  }
  .popup-close:hover { background: var(--divider-color); }
  .popup-body { overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 14px; }
  .popup-section { display: flex; flex-direction: column; gap: 8px; }
  .popup-section-title {
    font-size: 10px; text-transform: uppercase; letter-spacing: .8px;
    color: var(--secondary-text-color); font-weight: 700;
    padding-bottom: 5px; border-bottom: 2px solid var(--primary-color);
    display: inline-block;
  }
  .popup-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .pfield { display: flex; flex-direction: column; gap: 3px; }
  .pfield .plabel { font-size: 10px; color: var(--secondary-text-color); font-weight: 500; text-transform: uppercase; letter-spacing: .4px; }
  .pfield .pvalue { font-size: 13px; color: var(--primary-text-color); font-family: monospace; word-break: break-all; }
  .pfield .pvalue.empty { color: var(--disabled-text-color); font-style: italic; font-family: inherit; font-size: 12px; padding: 0; text-align: left; }
  .pfield.full { grid-column: 1 / -1; }
  .ip-tag {
    display: inline-block;
    background: var(--secondary-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 6px; padding: 2px 8px;
    font-size: 11px; font-family: monospace; margin: 2px;
  }

  /* ── Champs éditables dans le popup ── */
  .pedit-wrap {
    display: flex; gap: 6px; align-items: center;
  }
  .pedit-input {
    flex: 1; height: 32px; padding: 0 10px;
    font-size: 13px; font-family: inherit;
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    background: var(--secondary-background-color);
    color: var(--primary-text-color);
    outline: none;
  }
  .pedit-input:focus { border-color: var(--primary-color); }
  .pedit-select {
    flex: 1; height: 32px; padding: 0 8px;
    font-size: 13px; font-family: inherit;
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    background: var(--secondary-background-color);
    color: var(--primary-text-color);
    outline: none;
    cursor: pointer;
  }
  .pedit-btn {
    width: 32px; height: 32px; flex-shrink: 0;
    border: 1px solid var(--primary-color);
    border-radius: 8px;
    background: var(--primary-color);
    color: white;
    font-size: 14px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: opacity .15s;
  }
  .pedit-btn:disabled { opacity: .5; cursor: default; }
  .pedit-btn:hover:not(:disabled) { opacity: .85; }
`;

class FreeboxNetworkInventoryCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._cfg     = {};
    this._hass    = null;
    this._filter  = 'all';
    this._search  = '';
    this._sortCol = 'name';
    this._sortDir = 1;
    this._page    = 0;
    this._ready   = false;
  }

  setConfig(cfg) {
    this._cfg = { title: 'Freebox Network Inventory', page_size: PAGE_DEF, default_filter: 'all', ...cfg };
    if (!this._ready) this._filter = this._cfg.default_filter || 'all';
  }
  static getStubConfig() { return { title: 'Freebox Network Inventory', page_size: 10, default_filter: 'online' }; }

  set hass(hass) {
    this._hass = hass;
    if (!this._ready) { this._build(); this._ready = true; }
    this._update();
  }

  _build() {
    const r = this.shadowRoot;
    r.innerHTML = `<style>${STYLES}</style>
    <ha-card class="card">
      <div class="card-header">
        <div class="main-title">${this._cfg.title}</div>
        <div class="subtitle" id="subtitle"></div>
      </div>
      <div class="toolbar">
        <div class="search-wrap">
          <ha-icon class="search-icon" icon="mdi:magnify"></ha-icon>
          <input class="search" id="search" type="text" placeholder="Search (name, IP, MAC, host or type)" autocomplete="off">
        </div>
        <div class="filter-group" id="filters">
          <button class="fbtn" data-f="all">All</button>
          <button class="fbtn" data-f="online">Online</button>
          <button class="fbtn" data-f="offline">Offline</button>
          <button class="fbtn" data-f="static" title="Static DHCP leases">Static</button>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th style="width:36px"></th>
            <th data-col="name">Name <span class="sa">↕</span></th>
            <th data-col="online">Status <span class="sa">↕</span></th>
            <th data-col="ip">IP <span class="sa">↕</span></th>
            <th data-col="vendor">Vendor <span class="sa">↕</span></th>
            <th data-col="host_type">Type <span class="sa">↕</span></th>
            <th data-col="persistent" title="Kept in the Freebox inventory even when offline">Persistent <span class="sa">↕</span></th>
            <th data-col="last_seen">Last seen <span class="sa">↕</span></th>
          </tr></thead>
          <tbody id="tbody"></tbody>
        </table>
        <div class="empty" id="empty" style="display:none">No device found</div>
      </div>
      <div class="pagination">
        <span id="pi"></span>
        <div class="pbtns">
          <button class="pbtn" id="prev" disabled>‹</button>
          <button class="pbtn" id="next" disabled>›</button>
        </div>
      </div>
    </ha-card>

    <div class="overlay hidden" id="overlay">
      <div class="popup">
        <div class="popup-header">
          <div class="popup-icon"><ha-icon id="picon" icon="mdi:devices"></ha-icon></div>
          <div class="popup-title">
            <div class="pname" id="pname"></div>
            <div class="pmac"  id="pmac"></div>
          </div>
          <div class="popup-status" id="pstatus"></div>
          <button class="popup-close" id="pclose">✕</button>
        </div>
        <div class="popup-body" id="pbody"></div>
      </div>
    </div>`;

    // Activer le bon bouton filtre
    r.querySelectorAll('.fbtn').forEach(b => b.classList.toggle('active', b.dataset.f === this._filter));

    // Colonne triée par défaut
    const defaultTh = r.querySelector('th[data-col="name"]');
    if (defaultTh) { defaultTh.classList.add('sorted'); defaultTh.querySelector('.sa').textContent = '↓'; }

    r.getElementById('search').addEventListener('input', e => {
      this._search = e.target.value; this._page = 0; this._renderTable();
    });
    r.getElementById('filters').addEventListener('click', e => {
      const b = e.target.closest('.fbtn'); if (!b) return;
      this._filter = b.dataset.f; this._page = 0;
      r.querySelectorAll('.fbtn').forEach(x => x.classList.toggle('active', x === b));
      this._renderTable();
    });
    r.querySelector('thead').addEventListener('click', e => {
      const th = e.target.closest('th[data-col]'); if (!th) return;
      const col = th.dataset.col;
      this._sortDir = this._sortCol === col ? this._sortDir * -1 : 1;
      this._sortCol = col;
      r.querySelectorAll('th').forEach(t => { t.classList.remove('sorted'); t.querySelector('.sa').textContent = '↕'; });
      th.classList.add('sorted');
      th.querySelector('.sa').textContent = this._sortDir === 1 ? '↓' : '↑';
      this._page = 0; this._renderTable();
    });
    r.getElementById('tbody').addEventListener('click', e => {
      const el = e.target.closest('.dev-name[data-mac]');
      if (el) { e.stopPropagation(); this._openPopup(el.dataset.mac); }
    });
    r.getElementById('prev').addEventListener('click', () => { if (this._page > 0) { this._page--; this._renderTable(); } });
    r.getElementById('next').addEventListener('click', () => { this._page++; this._renderTable(); });
    r.getElementById('pclose').addEventListener('click', () => this._closePopup());
    r.getElementById('overlay').addEventListener('click', e => { if (e.target === r.getElementById('overlay')) this._closePopup(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this._closePopup(); });
  }

  _getDevices() {
    const out = [];
    for (const [eid, state] of Object.entries(this._hass.states)) {
      if (!eid.startsWith(`sensor.${DOMAIN}_`)) continue;
      if (GLOBAL_KEYS.has(eid)) continue;
      if (state.state === 'unavailable') continue;
      const a = state.attributes || {};
      if (!a.mac) continue;   // capteurs switch, etc.
      out.push({
        eid,
        mac:           a.mac || '',
        name:          a.alias || a.hostname || eid.replace(`sensor.${DOMAIN}_`,'').replace(/_/g,' '),
        ip:            a.ipv4 || '',
        ipv6:          a.ipv6 || '',
        ip_list:       a.ip_list || [],
        ip_count:      a.ip_count || 0,
        vendor:        a.vendor || '',
        host_type:     a.host_type || '',
        domain:        a.domain_name || '',
        ap_mac:        a.access_point_mac || '',
        ap_speed:      a.ap_speed_mbps || null,
        first_seen:    a.first_seen || '',
        last_seen:     a.last_seen || '',
        last_activity: a.last_activity || '',
        online:        state.state === 'online',
        reachable:     a.reachable,
        active:        a.active,
        persistent:    a.persistent,
        static_lease:  !!a.static_lease,
        static_ip:     a.static_ip || '',
        static_comment:a.static_lease_comment || '',
      });
    }
    // Baux statiques dont la MAC n'est pas (ou plus) dans l'inventaire
    const known = new Set(out.map(d => d.mac.toUpperCase()));
    for (const l of this._leases()) {
      if (known.has((l.mac||'').toUpperCase())) continue;
      out.push({
        eid: null, orphan: true,
        mac: l.mac, name: l.comment || l.hostname || l.mac,
        ip: l.ip || '', ipv6: '', ip_list: l.ip ? [l.ip] : [], ip_count: l.ip ? 1 : 0,
        vendor: '', host_type: '', domain: '', ap_mac: '', ap_speed: null,
        first_seen: '', last_seen: '', last_activity: '',
        online: false, reachable: false, active: false, persistent: null,
        static_lease: true, static_ip: l.ip || '', static_comment: l.comment || '',
      });
    }
    return out;
  }

  _leases() {
    return this._hass?.states?.[LEASES_EID]?.attributes?.leases || [];
  }

  _filtered(all) {
    return all
      .filter(d => {
        if (this._filter === 'online'  && !d.online) return false;
        if (this._filter === 'offline' &&  d.online) return false;
        if (this._filter === 'static'  && !d.static_lease) return false;
        if (this._search) {
          const s = this._search.toLowerCase();
          return [d.name,d.mac,d.vendor,d.ip,d.static_ip,d.static_comment,d.host_type,d.domain].some(v=>(v||'').toLowerCase().includes(s));
        }
        return true;
      })
      .sort((a,b) => {
        let av = a[this._sortCol]??'', bv = b[this._sortCol]??'';
        if (this._sortCol === 'ip') { av = a.ip || a.static_ip || ''; bv = b.ip || b.static_ip || ''; }
        if (typeof av === 'boolean') return av===bv ? 0 : (av ? -this._sortDir : this._sortDir);
        if (this._sortCol === 'ip') {
          const n = ip => { const p=ip.split('.').map(Number); return p.length===4&&p.every(x=>!isNaN(x))?p.reduce((a,x)=>a*256+x,0):0; };
          const na=n(av),nb=n(bv); if (na||nb) return (na-nb)*this._sortDir;
        }
        return String(av).localeCompare(String(bv))*this._sortDir;
      });
  }

  _update() {
    const all = this._getDevices();
    this._renderSubtitle(all);
    this._renderTable(all);
  }

  _renderSubtitle(all) {
    const el = this.shadowRoot.getElementById('subtitle'); if (!el) return;
    const on  = all.filter(d=>d.online).length;
    const st  = all.filter(d=>d.static_lease).length;
    el.innerHTML = `<span class="count-badge"><b>${on}/${all.filter(d=>!d.orphan).length}</b> online</span>`
      + (st ? `<span class="count-badge"><b>${st}</b> static</span>` : '');
  }

  _renderTable(allArg) {
    const r=this.shadowRoot, tbody=r.getElementById('tbody'), empty=r.getElementById('empty');
    const pi=r.getElementById('pi'), prev=r.getElementById('prev'), next=r.getElementById('next');
    const all=allArg||this._getDevices(), rows=this._filtered(all);
    const ps=this._cfg.page_size, maxPage=Math.max(0,Math.ceil(rows.length/ps)-1);
    if (this._page>maxPage) this._page=maxPage;
    const slice=rows.slice(this._page*ps,(this._page+1)*ps);

    if (!slice.length) { tbody.innerHTML=''; empty.style.display=''; }
    else {
      empty.style.display='none';
      tbody.innerHTML = slice.map(d => {
        const onCls = d.online ? 'on' : 'off';
        const statusLabel = d.online ? 'Online' : 'Offline';
        const htBadge = d.host_type
          ? `<span class="type-badge neutral">${d.host_type}</span>`
          : '<span class="dash">—</span>';
        const vendor = d.vendor
          ? `<span class="vendor-text" title="${d.vendor}">${d.vendor}</span>`
          : '<span class="dash">—</span>';
        const icon = guessIcon(d.host_type, d.name, d.vendor);
        return `<tr>
          <td style="padding:8px 6px 8px 14px">
            <div class="dico"><ha-icon icon="${icon}"></ha-icon></div>
          </td>
          <td>
            <span class="dev-name" data-mac="${d.mac}" title="Cliquer pour les détails">${d.name}</span>
            <div class="dev-mac">${d.mac||'—'}</div>
          </td>
          <td>
            <div class="status-cell">
              <span class="status-dot ${onCls}"></span>
              <span class="status-text ${onCls}">${statusLabel}</span>
            </div>
          </td>
          <td>${this._ipCell(d)}</td>
          <td>${vendor}</td>
          <td>${htBadge}</td>
          <td>${d.persistent==null?'<span class="dash">—</span>':(d.persistent?'<span class="yes">✓</span>':'<span class="dash">✗</span>')}</td>
          <td><span class="seen-text">${relShort(d.last_seen)}</span></td>
        </tr>`;
      }).join('');
    }
    const from=rows.length?this._page*ps+1:0, to=Math.min((this._page+1)*ps,rows.length);
    pi.textContent=rows.length?`${from}–${to} of ${rows.length} device${rows.length>1?'s':''}`:'0 devices';
    prev.disabled=this._page===0; next.disabled=this._page>=maxPage;
  }

  _ipCell(d) {
    const ip = d.ip || d.static_ip;
    if (!ip) return '<span class="dash">—</span>';
    if (!d.static_lease) return `<span class="mono">${ip}</span>`;
    const mismatch = d.static_ip && d.ip && d.static_ip !== d.ip;
    const title = mismatch
      ? `Static lease ${d.static_ip} — current IP ${d.ip} (lease applied at next DHCP renewal)`
      : `Static lease${d.static_comment ? ' — ' + d.static_comment : ''}`;
    return `<span class="ip-cell" title="${esc(title)}"><span class="mono">${ip}</span>`
      + `<ha-icon class="lease-ico${mismatch?' lease-mismatch':''}" icon="${mismatch?'mdi:lock-alert':'mdi:lock'}"></ha-icon></span>`;
  }

  _openPopup(mac) {
    const all=this._getDevices(), d=all.find(x=>x.mac===mac); if (!d) return;
    const r=this.shadowRoot, icon=guessIcon(d.host_type,d.name,d.vendor);
    r.getElementById('picon').setAttribute('icon',icon);
    r.getElementById('pname').textContent=d.name;
    r.getElementById('pmac').textContent=d.mac||'—';
    const ps=r.getElementById('pstatus');
    ps.className=`popup-status ${d.online?'online':'offline'}`;
    ps.innerHTML=`<span class="status-dot ${d.online?'on':'off'}" style="width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:4px"></span>${d.online?'Online':'Offline'}`;

    const field=(label,value,full=false)=>{
      const v=(value!==null&&value!==undefined&&value!=='')? String(value):null;
      return `<div class="pfield${full?' full':''}"><div class="plabel">${label}</div><div class="pvalue${v?'':' empty'}">${v||'N/A'}</div></div>`;
    };

    // Liaison par MAC — fiable même si le slug change ou diffère
    // Les entités text/select exposent leur MAC dans les attributs
    let textEid = null, selectEid = null;
    for (const [eid, state] of Object.entries(this._hass.states)) {
      const aMac = (state.attributes?.mac || '').toUpperCase();
      if (aMac !== mac.toUpperCase()) continue;
      if (eid.startsWith(`text.${DOMAIN}_`))   textEid   = eid;
      if (eid.startsWith(`select.${DOMAIN}_`)) selectEid = eid;
      if (textEid && selectEid) break;
    }

    const textState     = textEid   ? this._hass.states[textEid].state   : null;
    const selectState   = selectEid ? this._hass.states[selectEid].state  : null;
    const selectOptions = selectEid ? (this._hass.states[selectEid].attributes?.options || []) : [];

    const ipTags=d.ip_list.length?d.ip_list.map(ip=>`<span class="ip-tag">${ip}</span>`).join(''):'<span class="pvalue empty">N/A</span>';

    r.getElementById('pbody').innerHTML=`
      ${textEid||selectEid?`
      <div class="popup-section">
        <div class="popup-section-title">✏️ Modifier (Freebox OS)</div>
        <div class="popup-grid">
          ${textEid?`<div class="pfield full"><div class="plabel">Nom</div><div class="pedit-wrap">
            <input class="pedit-input" id="pedit-name" type="text"
              value="${(textState||d.name||'').replace(/"/g,'&quot;')}"
              placeholder="Nom de l équipement">
            <button class="pedit-btn" id="pedit-name-btn">✓</button>
          </div></div>`:''}
          ${selectEid?`<div class="pfield full"><div class="plabel">Type</div><div class="pedit-wrap">
            <select class="pedit-select" id="pedit-type">
              ${selectOptions.map(o=>`<option value="${o}"${o===selectState?' selected':''}>${o}</option>`).join('')}
            </select>
            <button class="pedit-btn" id="pedit-type-btn">✓</button>
          </div></div>`:''}
        </div>
      </div>`:''}
      <div class="popup-section">
        <div class="popup-section-title">📌 Bail DHCP statique</div>
        <div class="popup-grid">
          <div class="pfield"><div class="plabel">Adresse IPv4 réservée</div>
            <input class="pedit-input" id="lease-ip" type="text" inputmode="decimal"
              value="${esc(d.static_ip || d.ip || '')}" placeholder="192.168.1.x"></div>
          <div class="pfield"><div class="plabel">Commentaire</div>
            <input class="pedit-input" id="lease-comment" type="text"
              value="${esc(d.static_comment)}" placeholder="facultatif"></div>
          <div class="pfield full"><div class="pedit-wrap" style="justify-content:flex-end">
            ${d.static_lease?'<button class="pedit-btn danger" id="lease-del" title="Supprimer le bail">🗑</button>':''}
            <button class="pedit-btn" id="lease-save" title="${d.static_lease?'Mettre à jour':'Créer'} le bail">✓</button>
          </div>
          <div class="pedit-hint">${d.static_lease
            ? `Bail actif : ${esc(d.static_ip)}${d.ip && d.ip!==d.static_ip ? ` — l'appareil utilise encore ${esc(d.ip)} jusqu'au prochain renouvellement DHCP` : ''}`
            : 'Aucun bail statique — l\'IP actuelle est proposée par défaut'}${this._rangeHint()}</div>
          <div class="pedit-err" id="lease-err"></div></div>
        </div>
      </div>
      <div class="popup-section">
        <div class="popup-section-title">Réseau</div>
        <div class="popup-grid">
          ${field('IPv4',d.ip)}${field('IPv6',d.ipv6)}${field('Nb adresses IP',d.ip_count||null)}
        </div>
        <div class="pfield full"><div class="plabel">Toutes les adresses IP</div><div>${ipTags}</div></div>
      </div>
      <div class="popup-section">
        <div class="popup-section-title">Identification</div>
        <div class="popup-grid">
          ${field('Nom d hôte',d.name)}${field('Alias Freebox',d.name)}
          ${field('Fabricant',d.vendor)}${field('Type',d.host_type)}
          ${field('Domaine',d.domain)}${field('MAC',d.mac)}
        </div>
      </div>
      <div class="popup-section">
        <div class="popup-section-title">Point d accès</div>
        <div class="popup-grid">
          ${field('MAC du point d accès',d.ap_mac)}
          ${field('Vitesse uplink',d.ap_speed?d.ap_speed+' Mbps':null)}
        </div>
      </div>
      <div class="popup-section">
        <div class="popup-section-title">Activité</div>
        <div class="popup-grid">
          ${field('Première présence',relativeTime(d.first_seen))}
          ${field('Dernière présence',relativeTime(d.last_seen))}
          ${field('Dernière activité',relativeTime(d.last_activity))}
        </div>
      </div>
      <div class="popup-section">
        <div class="popup-section-title">État</div>
        <div class="popup-grid">
          ${field('Joignable',d.reachable!=null?(d.reachable?'✅ Oui':'❌ Non'):null)}
          ${field('Actif',d.active!=null?(d.active?'✅ Oui':'❌ Non'):null)}
          ${field('Persistant',d.persistent!=null?(d.persistent?'✅ Oui':'❌ Non'):null)}
          ${field('Bail statique',d.static_lease?'✅ Oui':'❌ Non')}
        </div>
      </div>`;

    r.getElementById('overlay').classList.remove('hidden');

    // Bouton renommer
    const nameBtn=r.getElementById('pedit-name-btn');
    if (nameBtn && textEid) {
      nameBtn.addEventListener('click', async () => {
        const val=r.getElementById('pedit-name').value.trim(); if (!val) return;
        nameBtn.textContent='⏳'; nameBtn.disabled=true;
        try {
          await this._hass.callService('text','set_value',{entity_id:textEid,value:val});
          nameBtn.textContent='✅';
          r.getElementById('pname').textContent=val;
          setTimeout(()=>{nameBtn.textContent='✓';nameBtn.disabled=false;},1500);
        } catch(e) {
          nameBtn.textContent='❌';
          setTimeout(()=>{nameBtn.textContent='✓';nameBtn.disabled=false;},1500);
        }
      });
    }

    // Bouton changer type
    const typeBtn=r.getElementById('pedit-type-btn');
    if (typeBtn && selectEid) {
      typeBtn.addEventListener('click', async () => {
        const val=r.getElementById('pedit-type').value; if (!val) return;
        typeBtn.textContent='⏳'; typeBtn.disabled=true;
        try {
          await this._hass.callService('select','select_option',{entity_id:selectEid,option:val});
          typeBtn.textContent='✅';
          setTimeout(()=>{typeBtn.textContent='✓';typeBtn.disabled=false;},1500);
        } catch(e) {
          typeBtn.textContent='❌';
          setTimeout(()=>{typeBtn.textContent='✓';typeBtn.disabled=false;},1500);
        }
      });
    }

    // Bail statique : créer / mettre à jour / supprimer
    const errEl = r.getElementById('lease-err');
    const runLease = async (btn, service, data) => {
      const label = btn.textContent;
      btn.textContent='⏳'; btn.disabled=true; errEl.textContent='';
      try {
        await this._hass.callService(DOMAIN, service, data);
        btn.textContent='✅';
        setTimeout(()=>{ if (!r.getElementById('overlay').classList.contains('hidden')) this._openPopup(mac); }, 1500);   // recharge avec l'état à jour
      } catch(e) {
        btn.textContent='❌'; errEl.textContent = e?.message || String(e);
        setTimeout(()=>{btn.textContent=label;btn.disabled=false;},2000);
      }
    };
    r.getElementById('lease-save')?.addEventListener('click', () => {
      const ip=r.getElementById('lease-ip').value.trim();
      if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) { errEl.textContent='Adresse IPv4 invalide'; return; }
      runLease(r.getElementById('lease-save'), 'set_static_lease',
        { mac, ip, comment: r.getElementById('lease-comment').value.trim() });
    });
    r.getElementById('lease-del')?.addEventListener('click', () => {
      runLease(r.getElementById('lease-del'), 'remove_static_lease', { mac });
    });
  }

  _rangeHint() {
    const a = this._hass?.states?.[LEASES_EID]?.attributes || {};
    return a.dhcp_range_start && a.dhcp_range_end
      ? `<br>Plage DHCP dynamique : ${esc(a.dhcp_range_start)} → ${esc(a.dhcp_range_end)}` : '';
  }

  _closePopup() { this.shadowRoot.getElementById('overlay').classList.add('hidden'); }
  getCardSize() { return 6; }
}

customElements.define('freebox-network-inventory-card', FreeboxNetworkInventoryCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'freebox-network-inventory-card',
  name: 'Freebox Network Inventory',
  description: 'Freebox network inventory — devices, static DHCP leases',
  preview: true, version: VERSION,
});
console.info(
  `%c FREEBOX-NETWORK-INVENTORY-CARD %c v${VERSION} `,
  'background:#185FA5;color:white;padding:2px 6px;border-radius:4px 0 0 4px;font-weight:500',
  'background:#0C447C;color:white;padding:2px 6px;border-radius:0 4px 4px 0',
);
