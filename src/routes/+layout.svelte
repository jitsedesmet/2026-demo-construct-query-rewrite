<script lang="ts">
  import type {LayoutProps} from "./$types";
  let { children }: LayoutProps = $props();
</script>

{@render children?.()}

<style>
    :global {
        body {
            margin: 0;
        }
        p {
            text-justify: auto;
            text-align: justify;
        }
        * {
            font-family: "Source Sans Pro", sans-serif;
            font-optical-sizing: auto;
            font-weight: 300;
            font-style: normal;
            font-variation-settings:
                    "slnt" 0;
            font-size: 1em;
            /* can be enabled again color: var(--color-main-text); */
        }
        h1, h2, h3, h4, h5 {
            padding: 0;
            margin: 0;
        }
        h2 {
            font-size: 2em;
        }
        h3 {
            font-size: 1.5em;
        }
        button {
            cursor: pointer;
            background: none;
            border: none;
        }
        div {
            color: var(--color-text);
        }
        ul {
            padding: 0;
            margin: 0;
            list-style-type: none;
        }
        a {
            color: var(--color-text);
        }
        html {
            background-color: var(--color-bg);
            --color-bg: white;
            --color-gray-canvas: #F6F6F6;
            --color-text: black;
            --color-opposite-text: white;
            --color-primary: #2194f3;
            --color-primary-dark: #1045a1;
            --color-danger: #E65244;
            --color-success: #49D793;
            --color-warning: #f37f21;
            --color-complete: #A599C6;
            --color-info: #42a4f5;
        }

        /* https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/tooltip_role */
        [role="tooltip"], .hide-tooltip.hide-tooltip.hide-tooltip + [role="tooltip"] {
            visibility: hidden;
            position: absolute;
            top: 1rem;
            left: 1rem;
            background: var(--color-gray-canvas);
            color: black;
        }
        [aria-describedby]:hover, [aria-describedby]:focus {
            position: relative;
        }
        [aria-describedby]:hover  [role="tooltip"], [aria-describedby]:focus  [role="tooltip"] {
            transition-delay: 0.5s;
            visibility: visible;
        }
    }
</style>
