/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {}
	},
	plugins: [],
	corePlugins: {
		preflight: false // Disable Preflight to avoid conflicts with existing styles
	}
};
