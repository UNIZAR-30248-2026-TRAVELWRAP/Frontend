module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['tests_cucumber/step-definitions/**/*.ts'],
    paths: ['tests_cucumber/features/**/*.feature'],
    format: ['progress', 'summary'],
    publishQuiet: true
  }
};