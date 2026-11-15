<script lang="ts">
  import { startSnapshots } from './snapshot';
  import { onMount } from 'svelte';
  import { ROUTINE, NOT_STARTED, startRoutine, tick, nextStep, isRunning, isFinished, currentStretch, type RoutineState } from './routine';
  import { addRoutine, dayKey, todayCount, type Daily } from './daily';
  import { t, setLanguage, currentLanguage } from './i18n/index.svelte';
  import { paletteFrom, glassFrom, tintTextFrom, type Palette, type Glass } from './palette';
  import { offerTracker } from './tracker-offer';
  import { onPrefsChange } from './prefs-live';

  const TRACKER = { tag: 'movement', get label() { return t('trackerLabel'); }, emoji: '🤸', color: '#30B0C7' };
  const STORAGE_KEY = 'stretch';

  let plugin: any;
  let view = $state<'modal' | 'widget'>('modal');
  let palette = $state<Palette>(paletteFrom(undefined));
  let glass = $state<Glass>(glassFrom(undefined));
  let tintText = $state(tintTextFrom(undefined));
  let scale = $state(1);
  let routine = $state<RoutineState>(NOT_STARTED);
  let daily = $state<Partial<Daily>>({});
  let loaded = $state(false);

  const current = $derived(currentStretch(routine));
  const finished = $derived(isFinished(routine));
  const today = $derived(todayCount(daily, dayKey(new Date())));

  const applyNomieValues = () => {
    if (!plugin?.prefs) return;
    palette = paletteFrom(plugin.prefs);
    setLanguage(plugin.prefs?.language);
    glass = glassFrom(plugin.prefs);
    tintText = tintTextFrom(plugin.prefs);
    scale = plugin.prefs.fontScale || 1;
  };

  const load = async () => {
    await plugin.storage.init();
    daily = plugin.storage.getItem(STORAGE_KEY) || {};
    loaded = true;
  };

  const save = () => plugin?.storage.setItem(STORAGE_KEY, addRoutine(daily, dayKey(new Date())));

  const start = () => (routine = startRoutine());
  const skip = () => (routine = nextStep(routine));
  const stop = () => (routine = NOT_STARTED);

  // a routine that ends: the movement goes into the timeline, and the count goes up
  $effect(() => {
    if (!finished) return;
    daily = addRoutine(daily, dayKey(new Date()));
    save();
    plugin.createNote(`Stretch routine: ${ROUTINE.length} stretches #movement`);
    plugin.alert(t('routineDone'), t('alertBody'));
  });

  // the timer: one tick each second while a stretch runs
  $effect(() => {
    if (!isRunning(routine)) return;
    const timer = setInterval(() => (routine = tick(routine)), 1000);
    return () => clearInterval(timer);
  });

  onMount(() => {
    plugin = new NomiePlugin({
      name: 'Nomie Stretch',
      emoji: '🧘',
      description: 'A five-minute stretch routine with a timer for each stretch. Each finished routine is written into your timeline.',
      uses: ['createNote', 'alert', 'getStorageItem', 'setStorageItem', 'getTrackable', 'openTrackableEditor', 'confirm'],
      version: '2.0',
      addToCaptureMenu: true,
      addToMoreMenu: true,
      addToWidgets: true,
    });
    startSnapshots(plugin);
    onPrefsChange(plugin, () => applyNomieValues());
  // Nomie's widget settings read the widgets this plugin offers from 'widgets' (id, name and emoji).
  // This plugin offers one widget, so the list has one entry.
  plugin.onRegistered(async () => {
    await plugin.storage.init();
    await plugin.storage.setItem('widgets', [{ widgetid: 'main', name: 'Stretch', emoji: '🧘' }]);
  });
  plugin.onRegistered(async () => {
      applyNomieValues();
      await load();
    });
    plugin.onWidget(async () => {
      view = 'widget';
      applyNomieValues();
      if (!loaded) await load();
    });
    plugin.onUIOpened(async () => {
      view = 'modal';
      applyNomieValues();
      offerTracker(plugin, TRACKER);
      if (!loaded) await load();
    });
  });
</script>

<div class="card" class:widget={view === 'widget'} style="--page: {palette.page}; --card: {palette.card}; --text: {palette.text}; --muted: {palette.textSecondary}; --line: {palette.separator}; --tint: {palette.tint}; --on-tint: {palette.onTint}; --tint-soft: {palette.tintSoft}; --good: {palette.good}; --fill: {palette.fill}; --tint-text: {tintText}; --glass-fill: {glass.fill}; --glass-edge: {glass.edge}; --glass-blur: {glass.blur}; --glass-shadow: {glass.shadow}; --scale: {scale};">
  {#if view === 'widget'}
    <div class="head">🧘 <span class="meta">{t('widgetToday', { n: today })}</span></div>
    {#if current}
      <div class="name">{current.name} · {t('secs', { s: routine.left })}</div>
    {:else if finished}
      <div class="name">{t('routineDone')}</div>
    {:else}
      <div class="name">{t('fiveMinutes')}</div>
    {/if}
    <button class="primary wide" onclick={!isRunning(routine) || finished ? start : skip}>{!isRunning(routine) || finished ? t('start') : t('next')}</button>
  {:else}
    <header class="top"><h1>{t('title')}</h1></header>
    <p class="muted">{t('todayLine', { n: today, unit: today === 1 ? t('routineOne') : t('routineMany') })}</p>

    {#if current}
      <section class="panel">
        <div class="big">{current.name}</div>
        <div class="time">{t('secs', { s: routine.left })}</div>
        <p>{current.cue}</p>
        <div class="row">
          <button class="ghost" onclick={skip}>{t('nextStretch')}</button>
          <button class="ghost" onclick={stop}>{t('stop')}</button>
        </div>
      </section>
    {:else if finished}
      <section class="panel">
        <div class="big">{t('routineDone')}</div>
        <p>{t('movementDone')}</p>
        <button class="primary" onclick={start}>{t('startAgain')}</button>
      </section>
    {:else}
      <button class="primary" onclick={start}>{t('startRoutine')}</button>
    {/if}

    <h2>{t('thisRoutine')}</h2>
    <ol>
      {#each ROUTINE as s, i (s.name)}
        <li class:active={i === routine.step} class:done={i < routine.step}>{s.name} · {t('secs', { s: s.seconds })}</li>
      {/each}
    </ol>
  {/if}
</div>

<style>
  /* the app's text: its iOS font stack, with the app's smoothing */
  :global(body) { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif; -webkit-font-smoothing: antialiased; --ios-font-rounded: ui-rounded, -apple-system, system-ui, sans-serif; }
  /* the header is a Liquid Glass bar (D-glass): it stays at the top and the content scrolls under it */
  .top { position: sticky; top: 0; z-index: 2; margin: -16px -16px 8px; padding: 16px 16px 10px; background: var(--glass-fill); -webkit-backdrop-filter: var(--glass-blur); backdrop-filter: var(--glass-blur); border-bottom: 1px solid var(--glass-edge); }
  .card { box-sizing: border-box; min-height: 100vh; padding: 16px; background: var(--page); color: var(--text); font-size: calc(16px * var(--scale)); line-height: 1.4; }
  .card.widget { min-height: 0; padding: 12px; font-size: calc(14px * var(--scale)); }
  h1 { margin: 0; font-size: calc(26px * var(--scale)); font-weight: 700; }
  h2 { margin: 20px 0 6px; font-size: calc(13px * var(--scale)); font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
  .muted { margin: 4px 0; color: var(--muted); }
  .head { display: flex; align-items: center; gap: 8px; font-weight: 600; }
  .meta { margin-left: auto; color: var(--muted); }
  .name { margin: 6px 0; font-weight: 600; }
  .panel { padding: 16px; border-radius: 16px; background: var(--card); text-align: center; }
  .big { font-size: calc(24px * var(--scale)); font-weight: 700; }
  .time { font-family: var(--ios-font-rounded); font-size: calc(48px * var(--scale)); font-weight: 700; font-variant-numeric: tabular-nums; color: var(--tint); }
  .row { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
  .primary, .ghost { padding: 10px 16px; border-radius: 12px; font: inherit; font-weight: 600; cursor: pointer; margin-top: 8px; }
  .primary { border: 0; background: var(--tint); color: var(--on-tint); }
  .wide { width: 100%; padding: 8px; }
  .ghost { border: 1px solid var(--line); background: transparent; color: var(--text); }
  ol { margin: 0; padding-left: 20px; }
  li { padding: 4px 0; }
  li.active { font-weight: 700; color: var(--tint-text); }
  li.done { color: var(--muted); text-decoration: line-through; }
</style>
