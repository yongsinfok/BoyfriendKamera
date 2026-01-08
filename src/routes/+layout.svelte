<script lang="ts">
	import '../app.css';
	import UpdateNotification from '$lib/components/UpdateNotification.svelte';
	import Onboarding from '$lib/components/Onboarding.svelte';
	import { onMount } from 'svelte';
	import { settings } from '$lib/stores/settings';

	let showOnboarding = false;
	let initialized = false;

	onMount(async () => {
		// Initialize settings and check if onboarding should be shown
		const savedSettings = await settings.init();
		// Only show onboarding if user hasn't seen it yet
		if (savedSettings && !savedSettings.hasSeenOnboarding) {
			showOnboarding = true;
		}
		initialized = true;
	});

	function closeOnboarding() {
		showOnboarding = false;
	}
</script>

{#if initialized}
	{#if showOnboarding}
		<Onboarding onClose={closeOnboarding} />
	{/if}
{/if}

<UpdateNotification />
<slot />
