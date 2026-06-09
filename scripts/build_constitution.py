from pathlib import Path
import subprocess
import sys

HERE = Path(__file__).resolve().parent
JS_PATH = HERE / 'build_constitution.js'


def check_node():
    try:
        subprocess.run(
            ['node', '--version'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True,
            text=True,
        )
    except FileNotFoundError:
        print('Node.js was not found. Install Node.js to run this script.')
        sys.exit(1)
    except subprocess.CalledProcessError as exc:
        print('Node.js is installed but returned an error:')
        print(exc.stderr or exc.stdout)
        sys.exit(exc.returncode)


def run_js():
    if not JS_PATH.exists():
        print(f'Missing required file: {JS_PATH}')
        sys.exit(1)

    result = subprocess.run(['node', str(JS_PATH)], text=True)
    if result.returncode != 0:
        print(f'Node script failed with exit code {result.returncode}')
        sys.exit(result.returncode)


if __name__ == '__main__':
    check_node()
    run_js()
