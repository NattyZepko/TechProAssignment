<script setup>
import { computed } from 'vue';

const props = defineProps({
	categories: { type: Array, required: true },
	categoryEnabled: { type: Object, required: true },
	valueMin: { type: Number, required: true },
	valueMax: { type: Number, required: true },
	valueDomainMin: { type: Number, required: true },
	valueDomainMax: { type: Number, required: true },
});

const emit = defineEmits(['toggle-category', 'set-value-min', 'set-value-max']);

const valueRangeLabel = computed(() => `${props.valueMin}–${props.valueMax}`);

function toggleCategory(categoryId) {
	emit('toggle-category', categoryId);
}

function onMinInput(e) {
	const next = Number(e.target.value);
	emit('set-value-min', next);
}

function onMaxInput(e) {
	const next = Number(e.target.value);
	emit('set-value-max', next);
}
</script>

<template>
	<div>
		<div class="section">
			<label
				>Value range: <b>{{ valueRangeLabel }}</b></label
			>

			<div class="row" style="align-items: center; gap: 10px">
				<span style="min-width: 48px">Min</span>
				<input
					type="range"
					:min="valueDomainMin"
					:max="valueDomainMax"
					:value="valueMin"
					@input="onMinInput"
					style="flex: 1"
				/>
				<span style="min-width: 48px; text-align: right">{{ valueMin }}</span>
			</div>

			<div class="row" style="align-items: center; gap: 10px; margin-top: 8px">
				<span style="min-width: 48px">Max</span>
				<input
					type="range"
					:min="valueDomainMin"
					:max="valueDomainMax"
					:value="valueMax"
					@input="onMaxInput"
					style="flex: 1"
				/>
				<span style="min-width: 48px; text-align: right">{{ valueMax }}</span>
			</div>
			<small>Scrub either slider; the map updates live.</small>
		</div>

		<div class="section">
			<label>Categories</label>
			<div class="row">
				<button
					v-for="c in categories"
					:key="c.id"
					class="chip"
					type="button"
					:aria-pressed="categoryEnabled[c.id] ? 'true' : 'false'"
					@click="toggleCategory(c.id)"
				>
					<span
						:style="{
							width: '10px',
							height: '10px',
							borderRadius: '999px',
							background: `rgb(${c.color[0]}, ${c.color[1]}, ${c.color[2]})`,
						}"
					></span>
					{{ c.label }}
				</button>
			</div>
		</div>
	</div>
</template>
