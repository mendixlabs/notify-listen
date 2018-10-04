const webpack = require("webpack");
const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const nodePackage = require("./package");
const packageName = nodePackage.packageName;
const widgetName = nodePackage.widgetName;

const widgetConfig = {
    entry: `./src/${packageName}/widget/${widgetName}.ts`,
    output: {
        path: path.resolve(__dirname, "dist/tmp"),
        filename: `src/${packageName}/widget/${widgetName}.js`,
        libraryTarget: "amd"
    },
    resolve: {
        extensions: [ ".ts", ".js" ]
    },
    module: {
        rules: [
            { test: /\.ts$/, use: "ts-loader" }
        ]
    },
    mode: "development",
    devtool: "source-map",
    externals: [ /^mxui\/|^mendix\/|^dojo\/|^dijit\// ],
    plugins: [
        new CopyWebpackPlugin([
            { from: "src/**/*.xml" }
        ], { copyUnmodified: true }),
        new webpack.LoaderOptionsPlugin({ debug: true })
    ]
};

const previewConfig = {
    entry: `./src/${packageName}/widget/${widgetName}.webmodeler.ts`,
    output: {
        path: path.resolve(__dirname, "dist/tmp"),
        filename: `src/${packageName}/widget/${widgetName}.webmodeler.js`,
        libraryTarget: "commonjs"
    },
    resolve: {
        extensions: [ ".ts" ]
    },
    module: {
        rules: [
            { test: /\.ts$/, use: "ts-loader" },
        ]
    },
    mode: "development",
    devtool: "inline-source-map",
    externals: [ "react", "react-dom" ],
    plugins: [ new webpack.LoaderOptionsPlugin({ debug: true }) ]
};

module.exports = [ widgetConfig, previewConfig ];
