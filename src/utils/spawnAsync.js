
import spawn from 'cross-spawn';

export default function spawnAsync(command, args, options) {
  return new Promise((resolve, reject) => {
    let isResolved = false,
        childProc = spawn(command, args, options);

    childProc.on('error', (err) => {
      if (isResolved) {
        return;
      }

      isResolved = true;
      reject(err);
    });

    childProc.on('exit', (code) => {
      if (isResolved) {
        return;
      }

      isResolved = true;

      if (code !== 0) {
        return reject(new Error('command not exit normally..'));
      }

      resolve();
    });
  });
}
