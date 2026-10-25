import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Users, CalendarDays } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { MAP_WIDTH, MAP_HEIGHT, projectPoint, provinces } from '../data/cambodiaProvinces';

// One site per entry in t.events.activities (same order).
const SITES = [
    { province: 'ratanakiri', lon: 107.25, lat: 13.72 },
    { province: 'takeo', lon: 104.8, lat: 11.12 },
    { province: 'siem-reap', lon: 103.86, lat: 13.45 },
    { province: 'kampong-chhnang', lon: 104.6, lat: 12.2 },
    { province: 'phnom-penh', lon: 104.89, lat: 11.56 },
    { province: 'kampong-speu', lon: 104.2, lat: 11.42 },
];
const HUB = SITES.findIndex((s) => s.province === 'phnom-penh');

const BASE_DEPTH = 8;
const RAISE = 12;
const TOP_Z = BASE_DEPTH + RAISE;
const TILT = { rx: 48, rz: -6 };
const CYCLE_MS = 4500;

const OUTLINE = provinces.map((p) => p.d).join('');
const activeProvinces = provinces.filter((p) => SITES.some((s) => s.province === p.id));
const sitePoints = SITES.map((s) => projectPoint(s.lon, s.lat));
const siteIndexOf = (provinceId) => SITES.findIndex((s) => s.province === provinceId);

// Curved route from Phnom Penh to each site, bowed "north" on the map.
const routes = sitePoints.map(([x1, y1], i) => {
    if (i === HUB) return null;
    const [x0, y0] = sitePoints[HUB];
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
    let nx = -dy / len, ny = dx / len;
    if (ny > 0) { nx = -nx; ny = -ny; }
    const bow = len * 0.28;
    return `M${x0} ${y0} Q${(x0 + x1) / 2 + nx * bow} ${(y0 + y1) / 2 + ny * bow} ${x1} ${y1}`;
});

const mix = (a, b, t) => {
    const pa = a.match(/\w\w/g).map((h) => parseInt(h, 16));
    const pb = b.match(/\w\w/g).map((h) => parseInt(h, 16));
    return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
};

const range = (from, to) => Array.from({ length: to - from }, (_, i) => from + i);

// Undoes the plane's tilt so children stand upright and face the viewer.
const BILLBOARD = {
    transformOrigin: '0 0',
    transform: 'rotateZ(calc(var(--rz) * -1)) rotateX(calc(var(--rx) * -1))',
};

function Layer({ z, children, style }) {
    return (
        <svg
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
            style={{ transform: `translateZ(${z}px)`, ...style }}
            aria-hidden="true"
        >
            {children}
        </svg>
    );
}

// Places children at a map coordinate, lifted to height z.
function Anchor({ x, y, z, children }) {
    return (
        <div
            className="absolute"
            style={{
                left: `${(x / MAP_WIDTH) * 100}%`,
                top: `${(y / MAP_HEIGHT) * 100}%`,
                transform: `translateZ(${z}px)`,
                transformStyle: 'preserve-3d',
            }}
        >
            {children}
        </div>
    );
}

export default function ImpactMap() {
    const { t, language } = useLanguage();
    const activities = t.events.activities;
    const copy = t.aboutUs.map;

    const [selected, setSelected] = useState(0);
    const [hovered, setHovered] = useState(null);
    const [pinned, setPinned] = useState(null);
    const sceneRef = useRef(null);
    const planeRef = useRef(null);
    const hoverRef = useRef(false);
    const pinnedRef = useRef(null);
    const skipTicksRef = useRef(0);

    const reduceMotion = typeof window !== 'undefined'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Auto-tour through the sites until the visitor takes over.
    useEffect(() => {
        if (reduceMotion) return undefined;
        const id = setInterval(() => {
            if (hoverRef.current || pinnedRef.current) return;
            if (skipTicksRef.current > 0) { skipTicksRef.current -= 1; return; }
            setSelected((i) => (i + 1) % SITES.length);
        }, CYCLE_MS);
        return () => clearInterval(id);
    }, [reduceMotion]);

    // Gentle idle drift plus pointer parallax, only while the map is on screen.
    useEffect(() => {
        const scene = sceneRef.current;
        const plane = planeRef.current;
        const apply = (rx, rz) => {
            plane.style.setProperty('--rx', `${rx}deg`);
            plane.style.setProperty('--rz', `${rz}deg`);
        };
        apply(TILT.rx, TILT.rz);
        if (reduceMotion) return undefined;

        const target = { x: 0, y: 0 };
        const current = { x: 0, y: 0 };
        let raf = 0;
        const onMove = (e) => {
            const r = scene.getBoundingClientRect();
            target.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
            target.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
        };
        const onLeave = () => { target.x = 0; target.y = 0; };
        const tick = (now) => {
            current.x += (target.x - current.x) * 0.06;
            current.y += (target.y - current.y) * 0.06;
            const s = now / 1000;
            apply(
                TILT.rx - current.y * 6 + Math.sin(s * 0.6) * 1.5,
                TILT.rz + current.x * 8 + Math.cos(s * 0.45) * 2,
            );
            raf = requestAnimationFrame(tick);
        };
        const io = new IntersectionObserver(([entry]) => {
            cancelAnimationFrame(raf);
            if (entry.isIntersecting) raf = requestAnimationFrame(tick);
        });
        io.observe(scene);
        scene.addEventListener('pointermove', onMove);
        scene.addEventListener('pointerleave', onLeave);
        return () => {
            io.disconnect();
            cancelAnimationFrame(raf);
            scene.removeEventListener('pointermove', onMove);
            scene.removeEventListener('pointerleave', onLeave);
        };
    }, [reduceMotion]);

    const hover = (id) => {
        hoverRef.current = id !== null;
        setHovered(id);
    };
    const pin = (id) => {
        pinnedRef.current = id;
        setPinned(id);
    };
    const choose = (index) => {
        skipTicksRef.current = 2; // let the visitor read their pick before the tour resumes
        pin(null);
        setSelected(index);
    };
    const clickProvince = (e, id) => {
        e.stopPropagation();
        const index = siteIndexOf(id);
        if (index >= 0) choose(index);
        else pin(pinned === id ? null : id);
    };

    const selectedProvince = SITES[selected].province;
    const activity = activities[selected];
    const provinceName = (p) => (language === 'km' ? p.km : p.en);
    const otherName = (p) => (language === 'km' ? p.en : p.km);
    const pad = (n) => {
        const s = String(n).padStart(2, '0');
        return language === 'km' ? s.replace(/\d/g, (d) => '០១២៣៤៥៦៧៨៩'[d]) : s;
    };

    // One callout at a time: what the visitor points at, else what they pinned, else the tour stop.
    const focus = provinces.find((p) => p.id === (hovered ?? pinned ?? selectedProvince));
    const focusSite = siteIndexOf(focus.id);
    const [calloutX, calloutY] = focusSite >= 0 ? sitePoints[focusSite] : [focus.cx, focus.cy];
    const isFocused = (id) => id === hovered || id === pinned;
    // Nudge the label inward near the map edges so it never leaves the screen.
    const edge = calloutX / MAP_WIDTH;
    const labelShift = edge > 0.68 ? '-translate-x-[38%]' : edge < 0.32 ? 'translate-x-[38%]' : '';

    return (
        <div className="relative w-full lg:absolute lg:inset-0">
            {/* Title + legend */}
            <div className="container mx-auto px-4 sm:px-6 pt-8 lg:pt-0 lg:px-0 lg:absolute lg:top-6 lg:right-8 lg:w-auto lg:z-10 flex flex-wrap items-center justify-between lg:justify-end gap-x-5 gap-y-1">
                <span className="text-xs font-extrabold tracking-wide text-[#192048]">{copy.title}</span>
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                    <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-[#192048]" />
                    {copy.legend}
                </span>
            </div>

            {/* 3D stage */}
            <div
                ref={sceneRef}
                onClick={() => pin(null)}
                className="relative w-full h-[min(58svh,86vw)] lg:absolute lg:inset-0 lg:h-auto flex items-center justify-center lg:pl-[42%] lg:[perspective-origin:71%_50%]"
                style={{ perspective: '1400px' }}
            >
                <div
                    ref={planeRef}
                    className="relative w-[min(90%,78svh)] lg:w-[min(54%,100svh)] lg:-mt-4"
                    style={{
                        aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}`,
                        transformStyle: 'preserve-3d',
                        transform: 'rotateX(var(--rx)) rotateZ(var(--rz))',
                        '--rx': `${TILT.rx}deg`,
                        '--rz': `${TILT.rz}deg`,
                    }}
                >
                    {/* Dotted floor */}
                    <div
                        className="absolute -inset-[45%] pointer-events-none"
                        style={{
                            transform: 'translateZ(-2px)',
                            backgroundImage: 'radial-gradient(rgba(25,32,72,0.16) 1px, transparent 1.4px)',
                            backgroundSize: '18px 18px',
                            maskImage: 'radial-gradient(closest-side, black 45%, transparent)',
                            WebkitMaskImage: 'radial-gradient(closest-side, black 45%, transparent)',
                        }}
                    />

                    {/* Soft ground shadow */}
                    <Layer z={-1} style={{ filter: 'blur(12px)', opacity: 0.22, translate: '12px 20px' }}>
                        <path d={OUTLINE} fill="#192048" />
                    </Layer>

                    {/* Country slab walls */}
                    {range(0, BASE_DEPTH).map((z) => (
                        <Layer key={`base-${z}`} z={z}>
                            <path d={OUTLINE} fill={mix('8d96b2', 'bcc3d6', z / BASE_DEPTH)} stroke={mix('8d96b2', 'bcc3d6', z / BASE_DEPTH)} strokeWidth="1" />
                        </Layer>
                    ))}

                    {/* Province top faces */}
                    <Layer z={BASE_DEPTH}>
                        {provinces.map((p) => (
                            <path
                                key={p.id}
                                d={p.d}
                                fill={isFocused(p.id) ? '#c9d0e3' : '#e8ebf2'}
                                stroke="#ffffff"
                                strokeWidth="1.2"
                                strokeLinejoin="round"
                                className="cursor-pointer"
                                style={{ pointerEvents: 'auto', transition: 'fill 150ms' }}
                                onPointerEnter={() => hover(p.id)}
                                onPointerLeave={() => hover(null)}
                                onClick={(e) => clickProvince(e, p.id)}
                            />
                        ))}
                    </Layer>

                    {/* Raised provinces we've reached */}
                    {range(BASE_DEPTH + 1, TOP_Z).map((z) => (
                        <Layer key={`raise-${z}`} z={z}>
                            {activeProvinces.map((p) => (
                                <path
                                    key={p.id}
                                    d={p.d}
                                    fill={mix('0a0f2e', '262f66', (z - BASE_DEPTH) / RAISE)}
                                    stroke={mix('0a0f2e', '262f66', (z - BASE_DEPTH) / RAISE)}
                                    strokeWidth="0.8"
                                />
                            ))}
                        </Layer>
                    ))}
                    <Layer z={TOP_Z}>
                        {activeProvinces.map((p) => (
                            <path
                                key={p.id}
                                d={p.d}
                                fill={p.id === selectedProvince ? '#FF383C' : isFocused(p.id) ? '#2c3678' : '#192048'}
                                stroke="rgba(255,255,255,0.45)"
                                strokeWidth="1"
                                strokeLinejoin="round"
                                className="cursor-pointer"
                                style={{ pointerEvents: 'auto', transition: 'fill 300ms' }}
                                onPointerEnter={() => hover(p.id)}
                                onPointerLeave={() => hover(null)}
                                onClick={(e) => clickProvince(e, p.id)}
                            />
                        ))}
                    </Layer>

                    {/* Routes from Phnom Penh */}
                    <Layer z={TOP_Z + 1}>
                        {routes.map((d, i) => d && (
                            <g key={i}>
                                <path d={d} fill="none" stroke="#FF383C" strokeOpacity={i === selected ? 0.35 : 0.12} strokeWidth="2.5" strokeLinecap="round" />
                                <path
                                    d={d}
                                    fill="none"
                                    stroke="#FF383C"
                                    strokeOpacity={i === selected ? 1 : 0.45}
                                    strokeWidth="1.6"
                                    strokeLinecap="round"
                                    strokeDasharray="5 6"
                                    className="impact-map-route"
                                />
                            </g>
                        ))}
                    </Layer>

                    {/* Pins */}
                    {sitePoints.map(([x, y], i) => {
                        const isSelected = i === selected;
                        return (
                            <Anchor key={SITES[i].province} x={x} y={y} z={TOP_Z + 1}>
                                {/* Flat pulse on the map surface */}
                                <span className="impact-map-pulse absolute -left-3 -top-3 h-6 w-6 rounded-full border-2 border-[#FF383C] pointer-events-none" />
                                <div className="absolute left-0 top-0" style={BILLBOARD}>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); choose(i); }}
                                        onPointerEnter={() => hover(SITES[i].province)}
                                        onPointerLeave={() => hover(null)}
                                        aria-label={activities[i].title}
                                        aria-pressed={isSelected}
                                        className="group absolute bottom-0 left-[-14px] flex w-7 flex-col items-center cursor-pointer"
                                    >
                                        <span
                                            className={`rounded-full border-2 border-white bg-[#FF383C] transition-all duration-300 ${isSelected ? 'h-4 w-4' : 'h-3 w-3 group-hover:h-3.5 group-hover:w-3.5'}`}
                                        />
                                        <span className={`w-[2px] bg-gradient-to-b from-[#192048] to-[#192048]/30 transition-all duration-300 ${isSelected ? 'h-7' : 'h-5'}`} />
                                    </button>
                                </div>
                            </Anchor>
                        );
                    })}

                    {/* Province title callout */}
                    <Anchor x={calloutX} y={calloutY} z={focusSite >= 0 ? TOP_Z + 1 : BASE_DEPTH + 1}>
                        {focusSite < 0 && (
                            <span className="impact-map-pulse absolute -left-3 -top-3 h-6 w-6 rounded-full border-2 border-[#192048] pointer-events-none" />
                        )}
                        <div className="absolute left-0 top-0 pointer-events-none" style={BILLBOARD}>
                            <div key={focus.id} className="impact-map-callout absolute bottom-0 left-0 flex -translate-x-1/2 flex-col items-center">
                                <div className={`whitespace-nowrap rounded-sm px-3 py-1.5 text-center ${labelShift} ${focusSite >= 0 ? 'bg-[#192048] text-white' : 'border border-[#192048]/15 bg-white text-[#192048]'}`}>
                                    <p className="text-xs sm:text-sm font-extrabold leading-tight">{provinceName(focus)}</p>
                                    <p className={`mt-0.5 text-[10px] font-semibold leading-tight ${focusSite >= 0 ? 'text-white/70' : 'text-slate-500'}`}>
                                        {otherName(focus)}
                                        {focusSite >= 0 && <span className="text-[#FF8A8C]"> · {copy.mission}</span>}
                                    </p>
                                </div>
                                <span className={`w-px ${focusSite >= 0 ? 'h-12 bg-[#192048]' : 'h-9 bg-[#192048]/50'}`} />
                                <span className="h-2 w-2 -mb-1 rounded-full border border-white bg-[#192048]" />
                            </div>
                        </div>
                    </Anchor>
                </div>
            </div>

            {/* Selected mission */}
            <div
                className="relative z-10 mx-4 mb-10 rounded-sm border border-slate-200 bg-white/95 p-4 backdrop-blur-sm sm:mx-6 lg:absolute lg:bottom-8 lg:right-8 lg:m-0 lg:w-[22rem]"
                aria-live="polite"
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wide text-[#FF383C]">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{activity.location}</span>
                        </p>
                        <h3 className="mt-1 min-h-[2.75rem] text-sm sm:text-base font-extrabold leading-snug text-[#192048] line-clamp-2">
                            {activity.title}
                        </h3>
                    </div>
                    <span className="shrink-0 pt-0.5 text-xs font-bold tabular-nums text-slate-400">
                        {pad(selected + 1)} / {pad(SITES.length)}
                    </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5 text-[#192048]" />
                            {activity.year}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-[#192048]" />
                            {activity.students}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5" role="group" aria-label={copy.title}>
                        {SITES.map((s, i) => (
                            <button
                                key={s.province}
                                type="button"
                                onClick={() => choose(i)}
                                aria-label={activities[i].title}
                                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${i === selected ? 'w-5 bg-[#FF383C]' : 'w-1.5 bg-slate-300 hover:bg-slate-400'}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
