from pyunpack import Archive
from shutil import move, copyfileobj, rmtree
from platform import machine
from sys import platform, exit
from subprocess import Popen, PIPE, call
from requests import Session
from os.path import exists, dirname, abspath
from os import unlink, chdir, urandom, system
from urllib.parse import urlparse, parse_qs
from binascii import hexlify
from time import sleep


def main():
    s = Session()

    if machine().endswith('64'):
        if not exists('./ffmpeg.exe'):
            x64_ffmpeg = s.get("https://ffmpeg.zeranoe.com/builds/win64/static/ffmpeg-20180130-42323c3-win64-static.zip", stream=True)
            print("\nСкачиваю FFMpeg...\n")

            with open("ffmpeg-20180130-42323c3-win64-static.zip", 'wb') as x64ff:
                copyfileobj(x64_ffmpeg.raw, x64ff)

            Archive('ffmpeg-20180130-42323c3-win64-static.zip').extractall('./')
            move('./ffmpeg-20180130-42323c3-win64-static/bin/ffmpeg.exe', './ffmpeg.exe')
            rmtree('./ffmpeg-20180130-42323c3-win64-static')
            unlink('./ffmpeg-20180130-42323c3-win64-static.zip')

    else:
        if not exists('./ffmpeg.exe'):
            x86_ffmpeg = s.get("https://ffmpeg.zeranoe.com/builds/win32/static/ffmpeg-20180130-42323c3-win32-static.zip", stream=True)
            print("\nСкачиваю FFMpeg...\n")

            with open("ffmpeg-20180130-42323c3-win32-static.zip", 'wb') as x86ff:
                copyfileobj(x86_ffmpeg.raw, x86ff)

            Archive('ffmpeg-20180130-42323c3-win32-static.zip').extractall('./')
            move('./ffmpeg-20180130-42323c3-win32-static/bin/ffmpeg.exe', './ffmpeg.exe')
            rmtree('./ffmpeg-20180130-42323c3-win32-static')
            unlink('./ffmpeg-20180130-42323c3-win32-static.zip')
    
    print("Готов к работе.")
    bug_exists = False
    
    if not bug_exists:
        auth_tkn = input("Теперь следуй инструкции и впиши токен: ")
        
        while True:
            try:
                referer_url = input("Теперь ссылку на erlyfronts: ")
                input("Надеюсь, ты вписал все правильно. В противном случае, тебе придется перезапускать приложение. Если так, то жми Ctrl + C. Если все норм, то Enter.")

                m3u8_id = ''.join(x for x in parse_qs(urlparse(referer_url).query)['conf']).split('-')[-1]
                m3u8_link = f"https://media-store-n.foxford.ru/api/v1/buckets/hls.webinar.foxford.ru/objects/{m3u8_id}.master.m3u8"
                filename = hexlify(urandom(8)) + ".mp4"
                print("Отлично.")

                sleep(1)
                call(f"""{abspath("./ffmpeg.exe")} -timeout 5000000 -reconnect 1 -reconnect_at_eof 1 -reconnect_streamed 1 -reconnect_delay_max 2 -headers "Authorization: {auth_tkn}" -headers "Referer: {referer_url}" -headers "Origin: https://lesson.foxford.ru" -user_agent "Mozilla/5.0 (iPhone; CPU iPhone OS 10_3 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) CriOS/56.0.2924.75 Mobile/14E5239e Safari/602.1" -i "{m3u8_link}" -bsf:a aac_adtstoasc -c copy {abspath("./" + filename)}""", shell=True)

                while not exists(abspath("./" + filename)):
                    sleep(1)
        
                input(f"Видео сохранено : {filename}. \n Выход - Ctrl + C. Если хочешь продолжить скачивание - Enter.")

                if platform.startswith('win'):
                    system('cls')
        
                else:
                    system('clear')
        
            except KeyboardInterrupt:
                exit(0)
    
    else:
        group_ids = []
        
        for id in group_ids:
            filename = hexlify(urandom(8)) + ".mp4"
            m3u8_link = f"https://media-store-n.foxford.ru/api/v1/buckets/hls.webinar.foxford.ru/objects/{id + 12000}.master.m3u8"
            Popen([f'{abspath("./ffmpeg.exe")}', '-timeout', '5000000', '-reconnect', '1', '-reconnect_at_eof', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '2', '-i', f'"{m3u8_link}"', '-bsf:a', 'aac_adtstoasc', '-c', 'copy', f'{abspath("./" + filename)}'], stdout=PIPE, stderr=PIPE)


if __name__ == "__main":
    chdir(dirname(abspath(__file__)))
    main()
