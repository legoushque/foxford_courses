from sys import platform, exit
from time import sleep


def system_platform():
    '''Selects driver depending on platform'''

    if platform.startswith('win'):
        return 'modules/driver/win/chromedriver.exe'

    else:
        raise NotImplementedError
