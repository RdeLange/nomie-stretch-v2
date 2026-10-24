<script lang="ts">
  import { onMount } from 'svelte';
  import { ROUTINE, NOT_STARTED, startRoutine, tick, nextStep, isRunning, isFinished, currentStretch, type RoutineState } from './routine';
  import { addRoutine, dayKey, todayCount, type Daily } from './daily';
  import { paletteFrom, type Palette } from './palette';
  import { offerTracker } from './tracker-offer';
  import { onPrefsChange } from './prefs-live';

  const TRACKER = { tag: 'movement', label: 'Movement', emoji: '🤸', color: '#30B0C7' };
  const STORAGE_KEY = 'stretch';

  let plugin: any;
  let view = $state<'modal' | 'widget'>('modal');
  let palette = $state<Palette>(paletteFrom(undefined));
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
    plugin.alert('Routine done', 'Nice work. Your stretch is in your timeline.');
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
    onPrefsChange(plugin, () => applyNomieValues());
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

<div class="card" class:widget={view === 'widget'} style="--page: {palette.page}; --card: {palette.card}; --text: {palette.text}; --muted: {palette.textSecondary}; --line: {palette.separator}; --tint: {palette.tint}; --on-tint: {palette.onTint}; --tint-soft: {palette.tintSoft}; --good: {palette.good}; --scale: {scale};">
  {#if view === 'widget'}
    <div class="head">🧘 <span class="meta">{today} today</span></div>
    {#if current}
      <div class="name">{current.name} · {routine.left}s</div>
    {:else if finished}
      <div class="name">Routine done</div>
    {:else}
      <div class="name">Five minutes of stretching</div>
    {/if}
    <button class="primary wide" onclick={!isRunning(routine) || finished ? start : skip}>{!isRunning(routine) || finished ? 'Start' : 'Next'}</button>
  {:else}
    <h1>Stretch</h1>
    <p class="muted">{today} {today === 1 ? 'routine' : 'routines'} today</p>

    {#if current}
      <section class="panel">
        <div class="big">{current.name}</div>
        <div class="time">{routine.left}s</div>
        <p>{current.cue}</p>
        <div class="row">
          <button class="ghost" onclick={skip}>Next stretch</button>
          <button class="ghost" onclick={stop}>Stop</button>
        </div>
      </section>
    {:else if finished}
      <section class="panel">
        <div class="big">Routine done</div>
        <p>Your movement is in the timeline.</p>
        <button class="primary" onclick={start}>Start again</button>
      </section>
    {:else}
      <button class="primary" onclick={start}>Start the routine</button>
    {/if}

    <h2>This routine</h2>
    <ol>
      {#each ROUTINE as s, i (s.name)}
        <li class:active={i === routine.step} class:done={i < routine.step}>{s.name} · {s.seconds}s</li>
      {/each}
    </ol>
  {/if}
</div>

<style>
  .card { box-sizing: border-box; min-height: 100vh; padding: 16px; background: var(--page); color: var(--text); font-size: calc(16px * var(--scale)); line-height: 1.4; }
  .card.widget { min-height: 0; padding: 12px; font-size: calc(14px * var(--scale)); }
  h1 { margin: 0 0 2px; font-size: calc(26px * var(--scale)); font-weight: 700; }
  h2 { margin: 20px 0 6px; font-size: calc(13px * var(--scale)); font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
  .muted { margin: 4px 0; color: var(--muted); }
  .head { display: flex; align-items: center; gap: 8px; font-weight: 600; }
  .meta { margin-left: auto; color: var(--muted); }
  .name { margin: 6px 0; font-weight: 600; }
  .panel { padding: 16px; border-radius: 16px; background: var(--card); text-align: center; }
  .big { font-size: calc(24px * var(--scale)); font-weight: 700; }
  .time { font-size: calc(48px * var(--scale)); font-weight: 700; font-variant-numeric: tabular-nums; color: var(--tint); }
  .row { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
  .primary, .ghost { padding: 10px 16px; border-radius: 12px; font: inherit; font-weight: 600; cursor: pointer; margin-top: 8px; }
  .primary { border: 0; background: var(--tint); color: var(--on-tint); }
  .wide { width: 100%; padding: 8px; }
  .ghost { border: 1px solid var(--line); background: transparent; color: var(--text); }
  ol { margin: 0; padding-left: 20px; }
  li { padding: 4px 0; }
  li.active { font-weight: 700; color: var(--tint); }
  li.done { color: var(--muted); text-decoration: line-through; }
</style>
