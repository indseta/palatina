export default {
    extends: ["stylelint-config-standard"],
    rules: {
        "no-empty-source": null,
        "selector-class-pattern": null,
        "selector-id-pattern": null,
        "custom-property-pattern": null,
        "property-no-vendor-prefix": [true, { ignoreProperties: ["-webkit-mask"] }]
    }
};
