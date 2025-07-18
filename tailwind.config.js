/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
    theme: {
        extend: {
            fontFamily: {
                // Add your custom fonts here
                'sans': ['IBM Plex Sans', 'Inter', 'system-ui', 'sans-serif'],
                'serif': ['IBM Plex Serif', 'serif'],
                'mono': ['IBM Plex Mono', 'monospace'],
            },
            colors: {
                // Your custom color palette
                primary: {
                    50: '#F0F2FF',
                    100: '#E0E5FF',
                    200: '#C7D0FF',
                    300: '#A3B3FF',
                    400: '#7A8CFF',
                    500: '#3848FF',
                    600: '#2A37CC',
                    700: '#1F2999',
                    800: '#161D66',
                    900: '#0D1133',
                    950: '#070A1A',
                },
                secondary: {
                    50: '#E6F7ED',
                    100: '#CCEFDB',
                    200: '#99DFB7',
                    300: '#66CF93',
                    400: '#33BF6F',
                    500: '#00A647',
                    600: '#008A3D',
                    700: '#006D33',
                    800: '#005129',
                    900: '#00341F',
                    950: '#001A10',
                },
                accent: {
                    50: '#F9E8E5',
                    100: '#F3D1CB',
                    200: '#E7A397',
                    300: '#DB7563',
                    400: '#CF472F',
                    500: '#C23B23',
                    600: '#A12F1C',
                    700: '#7F2315',
                    800: '#5E170E',
                    900: '#3D0B07',
                    950: '#1F0603',
                },
                warning: {
                    50: '#FFFBEB',
                    100: '#FEF7D6',
                    200: '#FDEFAD',
                    300: '#FCE784',
                    400: '#FBDF5B',
                    500: '#FCC404',
                    600: '#E6B003',
                    700: '#CC9C02',
                    800: '#B38802',
                    900: '#997401',
                    950: '#4D3A00',
                },
                // Custom grays based on your colors
                gray: {
                    50: '#FEFEFE',
                    100: '#F5F5F5',
                    200: '#EEEEEE',
                    300: '#CCCCCC',
                    400: '#999999',
                    500: '#666666',
                    600: '#4D4D4D',
                    700: '#333333',
                    800: '#272727',
                    900: '#1A1A1A',
                    950: '#0D0D0D',
                }
            },
            // Custom spacing, shadows, etc.
            boxShadow: {
                'custom': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                'custom-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            },
            borderRadius: {
                'custom': '12px',
            }
        },
    },
    plugins: [],
}