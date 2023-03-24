const path = require('path');

const rootConfig = {
  mode: 'development',
  optimization: {
    usedExports: true, // tells webpack to tree-shake
  },
  devtool: 'eval-source-map'
};

const appConfigOperatori = {
  ...rootConfig,
  entry: './src/indexOperatore.js',
  output: {
    filename: 'mainOperatori.js',
    path: path.resolve(__dirname, 'public/scripts'),
  },
};

const appConfigPaul = {
  entry: './src/indexPaul.js',
  output: {
    filename: 'mainPaul.js',
    path: path.resolve(__dirname, 'public/scripts'),
  },
};


const appConfigClienti = {
  ...rootConfig,
  entry: './src/indexCliente.js',
  output: {
    filename: 'mainClienti.js',
    path: path.resolve(__dirname, 'public/scripts'),
  },
};

module.exports = [appConfigOperatori, appConfigPaul,appConfigClienti];
