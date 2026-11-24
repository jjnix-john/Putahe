/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        malachite: "#57E165",
        olive: {
          light: "#7D8570",
          DEFAULT: "#646F58",
          dark: "#504B3A",
        },
        khaki: "#504B3A",
      },
    },
  },
  plugins: [],
};
