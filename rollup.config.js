/* eslint-env node */

import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import css from 'rollup-plugin-css-only';

const production = !process.env.ROLLUP_WATCH;

export default {
  input: 'src/index.js',
  output: {
    sourcemap: true,
    format: 'es',
    file: 'public/bundle.js'
  },
  plugins: [
    svelte(),

    css({
      output: 'bundle.css'
    }),

    resolve({
      browser: true
    }),

    commonjs(),

    production && terser()
  ]
};
