<script lang="ts">
	import {
		pixelarticons,
		type PixelarticonName,
	} from '../../icons/pixelarticons';

	let {
		name,
		class: className = 'w-6 h-6',
		id = undefined,
	}: {
		name: PixelarticonName;
		class?: string;
		id?: string;
	} = $props();
</script>

<svg
	{id}
	class={className}
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 24 24"
	aria-hidden="true"
>
	<path d={pixelarticons[name]} fill="currentColor"></path>
</svg>
