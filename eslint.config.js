import js from "@eslint/js";
import globals from "globals";

export default [
    {
        ignores: [".cache/", "node_modules/"]
    },
    js.configs.recommended,
    {
        files: ["js/**/*.js"],
        languageOptions: {
            globals: globals.browser
        }
    },
    {
        files: ["demo/**/*.js", "eslint.config.js", "stylelint.config.js"],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.browser
            }
        }
    },
    {
        rules: {
            curly: "error",
            eqeqeq: "error",
            "no-var": "error",
            "prefer-const": "error"
        }
    }
];
