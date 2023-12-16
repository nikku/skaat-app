<script>
  export let name;
  export let details = null;
</script>

<span class="action">

  {#if name === 'ask-bid'}
    Considers bid
  {/if}

  {#if name === 'bid'}
    Bids { details }
  {/if}

  {#if name === 'ask-ack'}
    Considers acknowledge
  {/if}

  {#if name === 'ack'}
    Acknowledged
  {/if}

  {#if name === 'pass'}
    Passes
  {/if}

  {#if name === 'ask-card'}
    Chooses a card
  {/if}

  {#if name === 'play-card'}
    Played <strong>{ details }</strong>
  {/if}

  {#if name === 'ask-skat'}
    Drops skat
  {/if}

  {#if name === 'ask-declare'}
    Chooses game
  {/if}

  {#if name === 'declare'}
    Announced <strong>{ details.suit }</strong>
  {/if}
</span>