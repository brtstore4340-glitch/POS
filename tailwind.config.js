/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Outfit"', '"Noto Sans Thai"', 'ui-sans-serif', 'system-ui'],
            },
            colors: {
                slate: {
                    50: '#f8fafc',
                }
            }
        },
    },
    plugins: [],
}
