const webpack = require("webpack");
const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const nodePackage = require("./package");
const widgetName = nodePackage.widgetName;

const widgetConfig = {
    entry: `./src/${widgetName}/widget/${widgetName}.ts`,
    output: {
        path: path.resolve(__dirname, "dist/tmp"),
        filename: `src/${widgetName}/widget/${widgetName}.js`,
        libraryTarget:  "amd"
    },
    resolve: {
        extensions: [ ".ts", ".js" ],
        alias: {
            "tests": path.resolve(__dirname, "./tests")
        }
    },
    module: {
        rules: [
            { test: /\.ts$/, use: "ts-loader" },
            { test: /\.scss$/, loader: ExtractTextPlugin.extract({
                fallback: "style-loader",
                use: "css-loader!sass-loader"
            }) },
            // { test: /\.scss$/, use: [ "css-loader", "sass-loader" ] }
        ]
    },
    mode: "development",
    devtool: "source-map",
    externals: [ /^mxui\/|^mendix\/|^dojo\/|^dijit\// ],
    plugins: [
        new CopyWebpackPlugin([
            { from: "src/**/*.js" },
            { from: "src/**/*.xml" }
        ], { copyUnmodified: true }),
        new ExtractTextPlugin({ filename: `./src/${widgetName}/widget/ui/${widgetName}.css` }),
        new webpack.LoaderOptionsPlugin({ debug: true })
    ]
};

const previewConfig = {
    entry: `./src/${widgetName}/widget/${widgetName}.webmodeler.ts`,
    output: {
        path: path.resolve(__dirname, "dist/tmp"),
        filename: `src/${widgetName}/widget/${widgetName}.webmodeler.js`,
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

module.exports = [ widgetConfig /*, previewConfig */ ];
