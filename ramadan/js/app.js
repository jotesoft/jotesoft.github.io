(() => {
    'use strict';

    // Bangladesh-specific configuration. This app is intentionally network-independent.
    const TIME_ZONE_OFFSET_HOURS = 6; // Bangladesh Standard Time (UTC+6)
    const DEG_TO_RAD = Math.PI / 180;
    const RAD_TO_DEG = 180 / Math.PI;
    const MINUTES_PER_DAY = 1440;
    const SECONDS_PER_DAY = 86400;

    const PRAYER_KEYS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const DIVISIONS = {
        Dhaka: { lat: 23.8103, lng: 90.4125, bn: 'ঢাকা' },
        Rajshahi: { lat: 24.3745, lng: 88.6042, bn: 'রাজশাহী' },
        Chittagong: { lat: 22.3569, lng: 91.7832, bn: 'চট্টগ্রাম' },
        Sylhet: { lat: 24.8949, lng: 91.8687, bn: 'সিলেট' },
        Khulna: { lat: 22.8456, lng: 89.5403, bn: 'খুলনা' },
        Barisal: { lat: 22.7010, lng: 90.3535, bn: 'বরিশাল' },
        Rangpur: { lat: 25.7439, lng: 89.2752, bn: 'রংপুর' },
        Mymensingh: { lat: 24.7471, lng: 90.4203, bn: 'ময়মনসিংহ' }
    };

    const LANG = {
        en: {
            title: 'Ramadan Daily', method: 'Method', hanafi: 'Hanafi', salafi: 'Salafi', next: 'Next',
            sehri: 'Sehri Ends', iftar: 'Iftar Time', prayers: ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'],
            tomorrow: '(Tomorrow)', modalHead: 'Select Division', close: 'Close', install: 'Install App'
        },
        bn: {
            title: 'রমজান ডেইল', method: 'পদ্ধতি', hanafi: 'হানাফী', salafi: 'সালাফী', next: 'পরবর্তী',
            sehri: 'সেহরি শেষ', iftar: 'ইফতারের সময়', prayers: ['ফজর', 'সূর্যোদয়', 'যোহর', 'আসর', 'মাগরিব', 'এশা'],
            tomorrow: '(আগামীকাল)', modalHead: 'বিভাগ নির্বাচন করুন', close: 'বন্ধ করুন', install: 'অ্যাপ ইনস্টল করুন'
        }
    };

    const els = {
        title: document.getElementById('ui-title'),
        method: document.getElementById('ui-method'),
        madhabLabel: document.getElementById('madhab-label'),
        madhabToggle: document.getElementById('madhab-toggle'),
        langToggle: document.getElementById('lang-toggle'),
        sehriLabel: document.getElementById('ui-sehri-label'),
        iftarLabel: document.getElementById('ui-iftar-label'),
        installText: document.getElementById('ui-install-text'),
        dateDisplay: document.getElementById('date-display'),
        sehri: document.getElementById('sehri-val'),
        iftar: document.getElementById('iftar-val'),
        list: document.getElementById('prayer-list'),
        nextLabel: document.getElementById('next-label'),
        nextTime: document.getElementById('next-time'),
        countdown: document.getElementById('countdown'),
        footerClock: document.getElementById('footer-clock'),
        divisionTrigger: document.getElementById('division-trigger'),
        selectedDivision: document.getElementById('selected-division-label'),
        modalOverlay: document.getElementById('modal-overlay'),
        sheet: document.getElementById('selection-sheet'),
        modalHeader: document.getElementById('modal-header'),
        closeModal: document.getElementById('close-modal'),
        divisionList: document.getElementById('division-list'),
        installButton: document.getElementById('install-pwa-btn')
    };

    let currentDivision = localStorage.getItem('ramadan_div') || 'Rajshahi';
    if (!DIVISIONS[currentDivision]) currentDivision = 'Rajshahi';

    let deferredPrompt = null;

    function isBangla() { return els.langToggle.checked; }

    function getSettings() {
        return {
            isBn: isBangla(),
            isSalafi: els.madhabToggle.checked,
            division: DIVISIONS[currentDivision]
        };
    }

    function setModal(show) {
        document.body.classList.toggle('modal-active', show);
        els.modalOverlay.setAttribute('aria-hidden', String(!show));
        els.sheet.setAttribute('aria-hidden', String(!show));
        els.divisionTrigger.setAttribute('aria-expanded', String(show));
        if (show) els.closeModal.focus();
    }

    function selectDivision(key) {
        if (!DIVISIONS[key]) return;
        currentDivision = key;
        localStorage.setItem('ramadan_div', key);
        setModal(false);
        renderConfig();
        updateUI();
    }

    function renderConfig() {
        const { isBn } = getSettings();
        const language = isBn ? LANG.bn : LANG.en;

        els.madhabLabel.textContent = els.madhabToggle.checked ? language.salafi : language.hanafi;
        els.modalHeader.textContent = language.modalHead;
        els.closeModal.textContent = language.close;

        els.divisionList.replaceChildren();
        Object.keys(DIVISIONS).forEach(key => {
            const active = key === currentDivision;
            const label = isBn ? `${DIVISIONS[key].bn} বিভাগ` : `${key} Division`;
            const item = document.createElement('button');
            item.type = 'button';
            item.className = `sheet-item${active ? ' active-item' : ''}`;
            item.setAttribute('aria-pressed', String(active));
            item.addEventListener('click', () => selectDivision(key));

            const text = document.createElement('span');
            text.textContent = label;
            text.style.fontWeight = '700';

            const radio = document.createElement('span');
            radio.className = 'radio-circle';
            radio.setAttribute('aria-hidden', 'true');

            item.append(text, radio);
            els.divisionList.appendChild(item);
        });

        const activeLabel = isBn ? `${DIVISIONS[currentDivision].bn} বিভাগ` : `${currentDivision} Division`;
        els.selectedDivision.textContent = activeLabel;
    }

    function saveAndRefresh() {
        localStorage.setItem('ramadan_salafi', String(els.madhabToggle.checked));
        localStorage.setItem('ramadan_lang', els.langToggle.checked ? 'bn' : 'en');
        renderConfig();
        updateUI();
    }

    // NOAA-style fractional-year approximation, evaluated near solar noon.
    // Returns equation of time in minutes and solar declination in radians.
    function solarPosition(date) {
        const year = date.getFullYear();
        const start = new Date(year, 0, 1);
        const dayOfYear = Math.floor((date - start) / 86400000) + 1;
        const leap = new Date(year, 1, 29).getDate() === 29;
        const daysInYear = leap ? 366 : 365;
        const gamma = 2 * Math.PI / daysInYear * (dayOfYear - 1 + 0.5);

        const equationOfTime = 229.18 * (
            0.000075 +
            0.001868 * Math.cos(gamma) -
            0.032077 * Math.sin(gamma) -
            0.014615 * Math.cos(2 * gamma) -
            0.040849 * Math.sin(2 * gamma)
        );

        const declination =
            0.006918 -
            0.399912 * Math.cos(gamma) +
            0.070257 * Math.sin(gamma) -
            0.006758 * Math.cos(2 * gamma) +
            0.000907 * Math.sin(2 * gamma) -
            0.002697 * Math.cos(3 * gamma) +
            0.00148 * Math.sin(3 * gamma);

        return { equationOfTime, declination };
    }

    function hourAngleForZenith(zenithDeg, latRad, declinationRad) {
        const zenith = zenithDeg * DEG_TO_RAD;
        const numerator = Math.cos(zenith) - Math.sin(latRad) * Math.sin(declinationRad);
        const denominator = Math.cos(latRad) * Math.cos(declinationRad);
        const ratio = Math.max(-1, Math.min(1, numerator / denominator));
        return Math.acos(ratio) * RAD_TO_DEG / 15;
    }

    function asrAltitudeDeg(factor, latRad, declinationRad) {
        const latitude = Math.abs(latRad - declinationRad);
        return Math.atan(1 / (factor + Math.tan(latitude))) * RAD_TO_DEG;
    }

    function normalizeMinutes(minutes) {
        const value = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
        return value;
    }

    /**
     * Calculates prayer-event times as decimal local hours in Bangladesh time.
     * Fajr/Isha: 18° solar depression; Sunrise/Sunset: 90.833° zenith;
     * Dhuhr: solar noon; Asr: shadow factor 1 (Salafi) or 2 (Hanafi).
     */
    function getTimes(date, loc, isSalafi) {
        const { equationOfTime, declination } = solarPosition(date);
        const latRad = loc.lat * DEG_TO_RAD;
        const solarNoonMinutes =
            720 -
            4 * loc.lng -
            equationOfTime +
            TIME_ZONE_OFFSET_HOURS * 60;

        const fajrHA = hourAngleForZenith(108, latRad, declination);
        const sunHA = hourAngleForZenith(90.833, latRad, declination);
        const asrFactor = isSalafi ? 1 : 2;
        const asrAltitude = asrAltitudeDeg(asrFactor, latRad, declination);
        const asrZenith = 90 - asrAltitude;
        const asrHA = hourAngleForZenith(asrZenith, latRad, declination);

        return {
            Fajr: normalizeMinutes(solarNoonMinutes - fajrHA * 60) / 60,
            Sunrise: normalizeMinutes(solarNoonMinutes - sunHA * 60) / 60,
            Dhuhr: normalizeMinutes(solarNoonMinutes) / 60,
            Asr: normalizeMinutes(solarNoonMinutes + asrHA * 60) / 60,
            Maghrib: normalizeMinutes(solarNoonMinutes + sunHA * 60) / 60,
            Isha: normalizeMinutes(solarNoonMinutes + fajrHA * 60) / 60
        };
    }

    function toBnNum(value) {
        const n = { '0':'০','1':'১','2':'২','3':'৩','4':'৪','5':'৫','6':'৬','7':'৭','8':'৮','9':'৯' };
        return String(value).replace(/[0-9]/g, digit => n[digit]);
    }

    function formatD(decimalHours, isBn) {
        const hours = Math.floor(decimalHours);
        const minutes = Math.max(0, Math.min(59, Math.floor((decimalHours - hours) * 60)));
        const ap = hours >= 12 ? (isBn ? 'পিএম' : 'PM') : (isBn ? 'এএম' : 'AM');
        const twelveHour = hours % 12 || 12;
        const text = `${twelveHour}:${String(minutes).padStart(2, '0')} ${ap}`;
        return isBn ? toBnNum(text) : text;
    }

    function decimalHourToSeconds(decimalHours) {
        return Math.floor(decimalHours * 3600);
    }

    function formatDate(date, isBn) {
        return date.toLocaleDateString(isBn ? 'bn-BD' : 'en-GB', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    }

    function updateUI() {
        const { isBn, isSalafi, division } = getSettings();
        const language = isBn ? LANG.bn : LANG.en;
        const now = new Date();

        document.documentElement.lang = isBn ? 'bn' : 'en';
        els.title.textContent = language.title;
        els.method.textContent = language.method;
        els.madhabLabel.textContent = isSalafi ? language.salafi : language.hanafi;
        els.sehriLabel.textContent = language.sehri;
        els.iftarLabel.textContent = language.iftar;
        els.installText.textContent = language.install;
        els.dateDisplay.textContent = formatDate(now, isBn);

        const todayTimes = getTimes(now, division, isSalafi);
        els.sehri.textContent = formatD(todayTimes.Fajr, isBn);
        els.iftar.textContent = formatD(todayTimes.Maghrib, isBn);

        const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        let nextName = '';
        let nextSeconds = null;
        let found = false;

        els.list.replaceChildren();
        PRAYER_KEYS.forEach((key, index) => {
            const prayerSeconds = decimalHourToSeconds(todayTimes[key]);
            const active = !found && prayerSeconds > nowSeconds;
            if (active) {
                found = true;
                nextName = language.prayers[index];
                nextSeconds = prayerSeconds;
            }

            const row = document.createElement('div');
            row.className = `prayer-row${active ? ' is-next' : ''}`;

            const name = document.createElement('span');
            name.className = 'prayer-name';
            name.textContent = language.prayers[index];

            const time = document.createElement('span');
            time.className = 'prayer-time';
            time.textContent = formatD(todayTimes[key], isBn);

            row.append(name, time);
            els.list.appendChild(row);
        });

        let targetDate = now;
        let nextTimeDecimal = null;
        if (!found) {
            targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            const tomorrowTimes = getTimes(targetDate, division, isSalafi);
            nextName = `${language.prayers[0]} ${language.tomorrow}`;
            nextSeconds = decimalHourToSeconds(tomorrowTimes.Fajr);
            nextTimeDecimal = tomorrowTimes.Fajr;
        } else {
            const nextKey = PRAYER_KEYS.find((key, index) => language.prayers[index] === nextName);
            nextTimeDecimal = todayTimes[nextKey];
        }
        els.nextTime.textContent = formatD(nextTimeDecimal, isBn);

        const currentDateStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const targetStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();
        const dayOffset = Math.round((targetStart - currentDateStart) / 86400000);
        let diff = (nextSeconds - nowSeconds) + dayOffset * SECONDS_PER_DAY;
        if (diff < 0) diff += SECONDS_PER_DAY;

        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;
        const countdown = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

        els.nextLabel.textContent = `${language.next}: ${nextName}`;
        els.countdown.textContent = isBn ? toBnNum(countdown) : countdown;

        const footerTime = now.toLocaleTimeString(isBn ? 'bn-BD' : 'en-GB', {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
        const footerDate = now.toLocaleDateString(isBn ? 'bn-BD' : 'en-GB', {
            day: 'numeric', month: 'short'
        });
        els.footerClock.textContent = `${footerDate} | ${footerTime}`;
    }

    function loadStoredSettings() {
        els.madhabToggle.checked = localStorage.getItem('ramadan_salafi') === 'true';
        els.langToggle.checked = localStorage.getItem('ramadan_lang') === 'bn';
    }

    // PWA install UX is local-only; it does not require a network request.
    window.addEventListener('beforeinstallprompt', event => {
        event.preventDefault();
        deferredPrompt = event;
        if (!window.matchMedia('(display-mode: standalone)').matches) els.installButton.hidden = false;
    });

    els.installButton.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        try { await deferredPrompt.userChoice; } catch (_) { /* ignore */ }
        deferredPrompt = null;
        els.installButton.hidden = true;
    });

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        els.installButton.hidden = true;
    });

    els.divisionTrigger.addEventListener('click', () => setModal(true));
    els.closeModal.addEventListener('click', () => setModal(false));
    els.modalOverlay.addEventListener('click', () => setModal(false));
    els.langToggle.addEventListener('change', saveAndRefresh);
    els.madhabToggle.addEventListener('change', saveAndRefresh);
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && document.body.classList.contains('modal-active')) setModal(false);
    });

    loadStoredSettings();
    renderConfig();
    updateUI();
    setInterval(updateUI, 1000);

    // Service worker registration is same-origin and works without internet once installed/cached.
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').catch(error => {
                console.warn('Service worker registration failed:', error);
            });
        });
    }

    // Small debug hook for offline testing without changing the UI.
    window.RamadanDaily = Object.freeze({ getTimes, DIVISIONS });
})();
