const { spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');

require('should');
const fetch = require('node-fetch');

describe('smoke tests - going to take some time', () => {
  const context = {
    package: {
      filename: null,
      version: null,
      path: null
    },
    workdir: null,
    cliBin: null
  };

  before(() => {
    if (process.env.DEPLOY_KEY) {
      const rcPath = path.join(os.homedir(), '.zapierrc');
      if (!fs.existsSync(rcPath)) {
        fs.writeFileSync(
          rcPath,
          JSON.stringify({ deployKey: process.env.DEPLOY_KEY })
        );
      }
    }

    const npmPack = spawnSync('npm', ['pack'], { encoding: 'utf8' });
    const lines = npmPack.stdout.split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line) {
        context.package.filename = line;
        break;
      }
    }
    context.package.version = context.package.filename.match(
      /\d+\.\d+\.\d+/
    )[0];
    context.package.path = path.join(process.cwd(), context.package.filename);

    const tmpBaseDir = os.tmpdir();
    while (!context.workdir || fs.existsSync(context.workdir)) {
      context.workdir = path.join(
        tmpBaseDir,
        crypto.randomBytes(20).toString('hex')
      );
    }
    fs.mkdirSync(context.workdir);

    spawnSync('npm', ['install', '--production', context.package.path], {
      encoding: 'utf8',
      cwd: context.workdir
    });

    context.cliBin = path.join(
      context.workdir,
      'node_modules',
      '.bin',
      'zapier'
    );
  });

  after(() => {
    fs.unlink(context.package.path);
    fs.remove(context.workdir);
  });

  it('package size should not change much', async () => {
    const baseUrl = 'https://registry.npmjs.org/zapier-platform-cli';
    let res = await fetch(baseUrl);
    const packageInfo = await res.json();
    const latestVersion = packageInfo['dist-tags'].latest;

    res = await fetch(`${baseUrl}/-/zapier-platform-cli-${latestVersion}.tgz`, {
      method: 'HEAD'
    });
    const baselineSize = res.headers.get('content-length');
    const newSize = fs.statSync(context.package.path).size;
    newSize.should.be.within(baselineSize * 0.7, baselineSize * 1.3);
  });

  it('cli executable should exist', () => {
    fs.existsSync(context.cliBin).should.be.true();
  });

  it('zapier --version', () => {
    const proc = spawnSync(context.cliBin, ['--version'], { encoding: 'utf8' });
    const firstLine = proc.stdout.split('\n')[0].trim();
    firstLine.should.be.eql(`zapier-platform-cli/${context.package.version}`);
  });

  it('zapier init', () => {
    spawnSync(context.cliBin, ['init', 'awesome-app'], {
      cwd: context.workdir
    });

    const newAppDir = path.join(context.workdir, 'awesome-app');
    fs.existsSync(newAppDir).should.be.true();

    const appIndexJs = path.join(newAppDir, 'index.js');
    const appPackageJson = path.join(newAppDir, 'package.json');
    fs.existsSync(appIndexJs).should.be.true();
    fs.existsSync(appPackageJson).should.be.true();
  });

  it('zapier apps', function() {
    if (!process.env.DEPLOY_KEY) {
      this.skip();
    }
    const proc = spawnSync(context.cliBin, ['apps', '--format=json'], {
      encoding: 'utf8'
    });
    const result = JSON.parse(proc.stdout);
    result.should.be.Array();
  });
});
