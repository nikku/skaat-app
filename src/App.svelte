<script>
  import Action from './Action.svelte';

  import { Game, Automa, Grand, semanticSort } from 'skaat';

  import { bySymbol } from 'skaat-deck';

  const YOU = 'You';

  const suites = [
    [ '♣', '♣' ],
    [ '♠', '♠' ],
    [ '♥', '♥' ],
    [ '♦', '♦' ],
    [ 'G', 'Grand' ],
    [ 'N', 'Null' ]
  ];

  const bids = [
    18, 20, 22, 23, 24,
    27, 30, 33, 35, 36,
    40, 44, 46, 48, 50,
    55, 57, 60, 65, 66,
    70
  ];

  let participants = [
    [ 0, 'Walt', new Automa() ],
    [ 1, 'Mary', new Automa() ],
    [ 2, YOU ]
  ];

  let players;

  let game;

  let trace = [];

  let error;
  let action;
  let player;
  let state = {};

  let suit = null;

  let lastActions;

  function t(...args) {
    trace = [ ...trace, args ];
  }

  function pl(player) {
    return (typeof player === 'number' && players[player][1]) || 'NONE';
  }

  function next(step, ...args) {
    t('+', pl(player), step, ...args);

    try {
      if (typeof player === 'number') {
        lastActions = [
          ...lastActions.slice(0, player),
          [ step, ...args ],
          ...lastActions.slice(player + 1)
        ];
      }

      const n = game.next(step, player, ...args);

      action = n[0];
      player = n[1];

      state = game.state;

      if (
        (action === 'play-card' && state.currentTrick.length === 0) ||
        action === 'ask-declare' ||
        action === 'end'
      ) {
        lastActions = [ null, null, null ];
      }

      const automa = typeof player === 'number' && players[player][2];

      t('?', pl(player), action, automa ? 'A' : '');

      if (automa) {
        schedule(() => {
          const [ s, ...args ] = automa.next(game, action, player);

          next(s, ...args);
        });
      }
    } catch (err) {
      handleError(err);
    }
  }

  function schedule(fn) {
    const delay = Math.floor(Math.random() * 2000 + 1000);

    setTimeout(() => {
      try {
        fn();
      } catch (err) {
        handleError(err);
      }
    }, delay);
  }

  function handleError(err) {
    console.error(err);

    error = err.message;

    t('!', error);
  }

  function setSuit(_suit) {
    suit = _suit;
  }

  function declare() {
    try {
      return next('declare', { suit });
    } finally {
      suit = null;
    }
  }

  function color(card) {
    return card[0];
  }

  function selectCard(action, card) {
    if (action === 'ask-skat') {
      return event => {
        selectedCards = selectedCards.includes(card)
          ? selectedCards.filter(c => c !== card)
          : [ ...selectedCards, card ];
      };
    }
  }

  function playCard(action, card) {
    if (action === 'ask-card' && players[player][1] === YOU) {
      return event => {
        next('play-card', card);
      };
    }
  }

  $: cards = semanticSort(
    state.hands[participants[2][0]],
    state.game?.suit || suit || Grand
  );

  $: selectedCards =
    cards && cards.filter(c => selectedCards && selectedCards.includes(c));

  function nextGame() {
    participants = participants.map(p => [
      (p[0] + 1) % participants.length,
      p[1],
      p[2]
    ]);

    players = participants.slice().sort((a, b) => a[0] - b[0]);

    lastActions = [ null, null, null ];

    game = new Game({ verbose: true });

    t('~', players.map(p => p[1]).join(' '));

    next('start');
  }

  let logExpanded = false;

  nextGame();
</script>

<main>

  <h1>
    Let's Play <a href="https://github.com/nikku/skaat" target="_blank" rel="no-opener">Skaat</a>
  </h1>

  {#if error}
    <p class="notice error">
      { error } <button on:click={ () => error = null }>Ok</button>
    </p>
  {/if}

  <div class="table">

    {#each participants as [ playerIdx, name ], participantIndex}

      <div class="player player-{participantIndex}">
        <h3 class="name">
          {name}

          {#if state.game?.suit && players[state.player][0] === playerIdx}
            <span class="game">
              Declared <span class="card-{state.game.suit}">{ state.game.suit }</span>
            </span>
          {/if}
        </h3>


        {#if name !== YOU}
          {#if typeof player === 'number' && playerIdx === player}
            <Action name={action} />
          {:else}
            {#if lastActions[playerIdx]}
              <Action
                name={ lastActions[playerIdx][0] }
                details={ lastActions[playerIdx][1] }
              />
            {/if}
          {/if}
        {/if}

      </div>
    {/each}

    <div class="table-center">

      {#if action === 'ask-card' || action === 'end'}

        <div class="tricks">
          {#each ((state.currentTrick.length || !state.lastTrick) ? state.currentTrick : state.lastTrick) as trick}
            <span
              class="card card-{color(trick[1])}"
              title={ `Played by ${ players[trick[0]][1]}` }
            >{@html bySymbol[trick[1]] }</span>
          {/each}
        </div>
      {/if}

      {#if action === 'ended' && state.result }
        <div class="results">
          <h2>Game Ended</h2>

          <p>
            <strong>{players[state.result.player][1]}</strong> { state.result.outcome === 'loss' ? 'lost' : 'won'}.
          </p>

          <h3>Point Changes</h3>
          <pre>
            {#each state.result.points as points, player}
              { players[player][1] }: { points.reduce((sum, [ n, p ]) => sum + p, 0) }<br/>
            {/each}
          </pre>
        </div>
      {/if}

      {#if action === 'ask-declare' && player === null}
        <p class="notice">
          Everybody passed. What a pitty! <button class="btn" on:click={ () => nextGame() }>Go next</button>
        </p>
      {/if}

      {#if action === 'end'}
        <p class="notice">
          Game finished. <button class="btn" on:click={ () => action = 'ended' }>View Results</button>
        </p>
      {/if}

      {#if action === 'ended'}
        <p class="notice">
          Continue playing? <button class="btn" on:click={ () => nextGame() }>Go next</button>
        </p>
      {/if}

      {#if typeof player === 'number' && players[player][1] === YOU}
        <div class="player-action">

          {#if action === 'ask-bid'}
            <form on:submit|preventDefault={ (event) => next('bid', parseInt(event.target.elements['bid'].value)) }>
              <p>
                {#if state.bidding.bid}
                  Place a bid higher than <strong>{state.bidding.bid}</strong> or pass.
                {:else}
                  Place a bid or pass.
                {/if}
              </p>

              <p>
                <input type="number" name="bid" value={ bids.find(b => b > (state.bidding.bid || 17)) || state.bidding.bid } />
                <button class="btn">
                  Bid
                </button>

                <button
                  class="btn"
                  on:click|preventDefault={ (event) => next('pass') } type="button"
                >
                  Pass
                </button>
              </p>
            </form>
          {/if}

          {#if action === 'ask-ack'}
            <p>
              <strong>{ players[state.bidding.leader][1] }</strong> bids <strong>{ state.bidding.bid }</strong>. Acknowledge?
            </p>

            <p>
              <button
                class="btn"
                on:click|preventDefault={ (event) => next('ack') }
              >
                Ack
              </button>
              <button
                class="btn"
                on:click|preventDefault={ (event) => next('pass') }
              >
                Pass
              </button>
            </p>
          {/if}

          {#if action === 'ask-declare' && typeof player === 'number'}
            <p>
              You won the bidding at <strong>{ state.bidding.bid }</strong>. What would you like to play?
            </p>

            <p>
              {#each suites as [ key, label ]}
                <button
                  on:click|preventDefault={ () => setSuit(key) }
                  class:btn-primary={ key === suit }
                  class="btn"
                >
                  { label }
                </button>
              {/each}
            </p>

            <p>
              {#if state.skat.length }
                <button
                  class="btn"
                  on:click|preventDefault={ () => next('pick-skat') }
                >Pick Skat</button>
              {/if}

              <button
                class="btn btn-primary"
                disabled={ !suit }
                on:click|preventDefault={ declare }
              >
                Declare
              </button>
            </p>
          {/if}

          {#if action === 'ask-skat' && player !== null}
            <p>
              Select two cards to put back into Skat.
            </p>

            <p>
              {#each suites as [ key, label ]}
                <button
                  on:click|preventDefault={ () => setSuit(key) }
                  class="btn"
                  class:btn-primary={ key === suit }
                >
                  { label }
                </button>
              {/each}
            </p>

            <p>
              <button
                class="btn btn-primary"
                disabled={ selectedCards.length !== 2 }
                on:click|preventDefault={ () => next('put-skat', selectedCards) }
              >Put Skat</button>
            </p>
          {/if}

          {#if action === 'ask-card'}
            <p>
              Play a card.
            </p>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  {#if cards}
    <p class="hand">
      {#each cards as card}
        <button
          class="btn btn-none card card-{color(card)}"
          class:interactive={ selectCard(action, card) || playCard(action, card) }
          class:selected={ selectedCards.includes(card) }
          disabled={ !selectCard(action, card) && !playCard(action, card) }
          on:click={ selectCard(action, card) || playCard(action, card) }
        >
          {@html bySymbol[card] }
        </button>
      {/each}
    </p>
  {/if}

  <div class="log" class:expanded={ logExpanded }>
    {#if logExpanded}
      <div class="header">
        <button on:click={ () => logExpanded = false }>Close log</button>
      </div>
      <pre>
        {#each trace as t}
          { t.map(m => typeof m === 'object' ? JSON.stringify(m) : m).join(' ') }<br/>
        {/each}
      </pre>
    {:else}
      <div class="header">
        <button on:click={ () => logExpanded = true }>Open log</button>
      </div>
    {/if}
  </div>

</main>

<style>
  :global(html),
  :global(body),
  :global(#root),
  main {
    height: 100%;
    margin: 0;
  }

  main {
    font-family: sans-serif;
    display: flex;
    flex-direction: column;
  }

  .table {
    flex: 1;
  }

  h1 {
    padding: 0 10px;
  }

  .hand {
    text-align: center;
    display: flex;
    flex-direction: row;
    justify-content: center;
  }

  .notice {
    border: solid 1px steelblue;
    background: lightsteelblue;
    padding: 1em;
    margin: 1em 0;
  }

  .notice.error {
    border: solid 1px coral;
    background: lightcoral;
    border-radius: 5px;
  }

  .card {
    font-size: 1.4em;
    width: 5em;
    height: auto;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    border: solid 1px #333;
    background: white;
    border-radius: 0.25em;
    margin: 0.2em;
    padding: 0;
    overflow: hidden;
    position: relative;
    transition: margin ease .2s;
  }

  .card {
    margin-left: -1.5em;
    margin-right: -1.5em;
  }

  .card.selected,
  .card:focus,
  .card:hover {
    margin-top: -.5em;
    margin-bottom: 1em;
  }

  .card:focus,
  .card:hover {
    margin-right: .5em;
  }

  .card:focus:last-child,
  .card:hover:last-child {
    margin-right: -1.5em;
  }

  :global(.card svg) {
    width: 100%;
    height: 100%;
  }

  .card.interactive {
    box-shadow: 0 0 0 2px #fff0c4;
  }

  .card.selected {
    box-shadow: 0 0 0 4px #88c9ff;
  }

  .table {
    display: grid;
    grid-template-columns: 25% 1em auto 1em 25%;
    grid-template-rows: 100px 1em auto 1em 60px;
    margin: 10px;
  }

  .table .player {
    background: #f1f1f1;
    border: solid 1px #ccc;
    border-radius: 5px;
    padding: 0 1em;
  }

  .table .player .name {
    margin: 1em 0;
  }

  .player .game {
    padding: 0.25em 0.5em;
    background: lightblue;
    margin: auto 0.25em;
    font-weight: bold;
  }

  .player-0 {
    grid-column-start: 1;
    grid-row-start: 1;
  }

  .player-1 {
    grid-column-start: 5;
    grid-row-start: 1;
  }

  .player-2 {
    grid-column-start: 1;
    grid-column-end: 6;
    grid-row-start: 5;
    grid-row-end: 5;

    text-align: center;
  }

  .player-2 .name {
    display: inline-block;
  }

  .table-center {
    grid-column-start: 3;
    grid-column-end: 4;
    grid-row-start: 3;
    grid-row-end: 4;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .player-action {
    border: solid 3px #ffc107;
    background: #fff6db;
    padding: 0 1em;
    border-radius: 5px;
  }

  .tricks {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
  }

  .tricks .card {
    border-radius: 0.5em;
  }

  .tricks + .player-action {
    margin-top: 1em;
  }

  .results {
    background: #607d8b;
    padding: 0 1em;
    border-radius: 5px;
    color: #fff;
  }

  .log {
    overflow: auto;

    border-top: solid 1px #ccc;
    padding: 10px;
  }

  .log .header {
    text-align: right;
  }

  .log.expanded {
    height: 8em;
  }
</style>