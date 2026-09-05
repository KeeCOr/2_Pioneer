module.exports = {
  appId: 'com.keecor.pioneer',
  productName: 'Pioneer',
  directories: { output: 'release' },
  files: [
    'electron/**/*',
    'dist/**/*',
    'steam_appid.txt',
  ],
  win: {
    target: ['nsis', 'portable'],
    signAndEditExecutable: false,
  },
  nsis: {
    artifactName: 'Pioneer_v${version}_setup.exe',
    oneClick: false,
    allowToChangeInstallationDirectory: true,
  },
  portable: {
    artifactName: 'Pioneer_v${version}_portable.exe',
  },
};
