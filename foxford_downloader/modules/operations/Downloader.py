'''Imports'''

from os.path import abspath, join, exists
from os import listdir, makedirs, unlink
from shutil import move, copyfileobj, rmtree
from time import sleep
from platform import machine
from re import findall
from subprocess import call
from urllib.parse import urlparse, parse_qs
from pyunpack import Archive
from requests import Session
from selenium.common.exceptions import ElementNotVisibleException, NoSuchElementException
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from .ElementScreenshot import screenshot
from ..common.CleanScreen import cls


def theory_download(driver, course_name):
    '''Downloader for theory module'''

    driver.get('file:///' + join(abspath("."), course_name + '_theory.html'))  # <--- Getting HTML, generated with TheoryHTML.py, containing links

    main_window = driver.current_window_handle  # <--- Bind to tab with HTML file

    links = driver.find_elements_by_tag_name("a")  # <--- Making an array of links to iterate over them
    print('\n')

    # For each link...
    for i in range(len(links)):
        try:
            # If theory with this name already exists...
            if exists(join(abspath("."), str(links[i].text) + ".png")):
                # ... go to another link
                continue

            # ...else go next
            else:
                pass

            # Setting filename still
            file = str(links[i].text) + ".png"

            ActionChains(driver).move_to_element(links[i]).click(links[i]).perform()  # <--- ...locate it using driver even if it's not visible and click it.

            windows = driver.window_handles  # <--- Enumerating all tabs, because link is opening in new tab (see TheoryHTML.py)

            driver.switch_to.window(windows[1])  # <--- Switching to tab with theory

            sleep(1)

            try:
                # If there are any spoilers, make an array of them...
                spoilers = driver.find_elements_by_class_name("toggle_content")

                # ...and make each of them visible.
                for i in range(len(spoilers)):
                    driver.execute_script("arguments[0].style.display = 'block';", spoilers[i])
                    sleep(1)

            # If none located, go next.
            except NoSuchElementException:
                pass

            # Screenshot theory area (see ElementScreenshot.py)
            screenshot(driver, file, 'theory')
            sleep(1)

            print("Теория получена.")
            sleep(1)

        except ElementNotVisibleException:
            print("Элемент не виден.")

        except NoSuchElementException:
            print("Где-то что-то не так.")

        # Return back to HTML
        driver.execute_script('window.close();')
        driver.switch_to.window(main_window)
        sleep(1)
        print('---\n')

    print('\n---\n')

    for filename in listdir(abspath(".")):
        if filename.endswith(".png"):
            # move theory to directory
            try:
                makedirs(join(abspath("."), course_name, filename.split("_")[0], "Теория"))

            except FileExistsError:
                pass

            move(
                join(abspath('.'), filename),
                join(abspath('.'), course_name, filename.split('_')[0], "Теория", filename.split('_')[1])
            )


def homework_download(driver, course_name):
    '''Downloader for hw module'''

    driver.get('file:///' + abspath(course_name + '_homework.html'))
    main_window = driver.current_window_handle
    links = driver.find_elements_by_tag_name("a")
    print('\n')

    swap = False
    for i in range(len(links)):
        try:
            # If hw with this name already exists...
            if exists(join(abspath("."), str(links[i].text) + "_1" + ".png")):
                # ...go to another link
                continue

            # ...else go next
            elif exists(join(abspath("."), str(links[i].text) + "_0" + ".png")):
                swap = True

            link_text = str(links[i].text)
            links[i].click()
            windows = driver.window_handles
            driver.switch_to.window(windows[1])
            sleep(1)

            # This should break custom scroll so we can make screenshot properly
            # before "try:" goes screenshot of homework, which is probably unsolved. After "try:" we are clicking "give up" button to reveal answers
            # And making screenshot again. If location of "give up" button fails, then it means, that hw is solved. We are renaming HW.

            if swap is True:
                try:
                    give_up = driver.find_element_by_xpath("//a[contains(text(), 'Сдаюсь!')]")
                    ActionChains(driver).move_to_element(give_up).click(give_up).perform()
                    sleep(1)
                    agree = WebDriverWait(driver, 20).until(EC.element_to_be_clickable((By.XPATH, "//div[contains(text(), 'Да')]")))
                    ActionChains(driver).move_to_element(agree).click(agree).perform()
                    sleep(1)

                    driver.get(driver.current_url)
                    sleep(1)

                except NoSuchElementException:
                    pass

            wrapper = driver.find_element_by_xpath("(//div[@class='custom-scroll '])[2]/../..")
            content = driver.find_element_by_xpath("(//div[@class='content-wrapper'])[2]")
            content_content = driver.find_element_by_xpath("(//div[@class='content-wrapper'])[2]/*[1]")
            wrapper_orig = driver.execute_script("return arguments[0].innerHTML;", wrapper)
            sleep(1)

            driver.execute_script("arguments[0].setAttribute('style', '');", content)
            driver.execute_script("arguments[0].setAttribute('style', '');", content_content)
            driver.execute_script("arguments[0].innerHTML = arguments[1];", wrapper, content.get_attribute("outerHTML"))

            sleep(1)

            if swap is True:
                file = link_text + "_1" + ".png"
                screenshot(driver, file, 'homework')
                sleep(1)
                driver.execute_script("arguments[0].innerHTML = arguments[1]", wrapper, wrapper_orig)
                sleep(1)

                driver.execute_script('window.close();')
                driver.switch_to.window(main_window)
                print('---\n')
                sleep(1)
                swap = False
                continue

            file = link_text + "_0" + ".png"
            screenshot(driver, file, 'homework')
            sleep(1)
            driver.execute_script("arguments[0].innerHTML = arguments[1]", wrapper, wrapper_orig)
            sleep(1)

            try:
                give_up = driver.find_element_by_xpath("//a[contains(text(), 'Сдаюсь!')]")
                ActionChains(driver).move_to_element(give_up).click(give_up).perform()
                sleep(1)
                agree = WebDriverWait(driver, 20).until(EC.element_to_be_clickable((By.XPATH, "//div[contains(text(), 'Да')]")))
                ActionChains(driver).move_to_element(agree).click(agree).perform()
                sleep(1)

                driver.get(driver.current_url)
                sleep(1)

                wrapper = driver.find_element_by_xpath("(//div[@class='custom-scroll '])[2]/../..")
                content = driver.find_element_by_xpath("(//div[@class='content-wrapper'])[2]")
                content_content = driver.find_element_by_xpath("(//div[@class='content-wrapper'])[2]/*[1]")
                wrapper_orig = driver.execute_script("return arguments[0].innerHTML;", wrapper)
                sleep(1)

                driver.execute_script("arguments[0].setAttribute('style', '');", content)
                driver.execute_script("arguments[0].setAttribute('style', '');", content_content)
                driver.execute_script("arguments[0].innerHTML = arguments[1];", wrapper, content.get_attribute("outerHTML"))

                sleep(1)

                file = link_text + "_1" + ".png"
                screenshot(driver, file, 'homework')
                sleep(1)
                driver.execute_script("arguments[0].innerHTML = arguments[1]", wrapper, wrapper_orig)
                sleep(1)

            except NoSuchElementException:
                print("ДЗ уже решено.")
                move(join(abspath("."), link_text + "_0" + ".png"), join(abspath("."), link_text + "_1" + ".png"))

            print("ДЗ получено.")
            sleep(1)

        except ElementNotVisibleException:
            print("Элемент не виден.")

        driver.execute_script('window.close();')
        driver.switch_to.window(main_window)
        print('---\n')

    print('\n---\n')

    for filename in listdir(abspath(".")):
        if filename.endswith(".png"):
            # move hw to directory
            try:
                makedirs(join(abspath("."), course_name, filename.split("_")[0], "ДЗ"))

            except FileExistsError:
                pass

            move(
                join(abspath('.'), filename),
                join(abspath('.'), course_name, filename.split('_')[0], "ДЗ", "_".join(filename.split('_')[1:]))
            )


def video_download(driver, course_name, course_link, html_repair=False):

    '''Video downloader module. html_repair specifies if download was interrupted.'''

    driver.get('file:///' + join(abspath("."), course_name + '_videos.html'))  # <--- Getting HTML, generated by VideoHTML.py.
    main_window = driver.current_window_handle

    print('\n')

    # Amount of videos to skip. Counter.
    skips = 0
    auth_tkn = None

    driver.execute_script(f"""window.open("{driver.find_elements_by_tag_name("a")[0].get_attribute("href")}", "_blank");""")
    sleep(1)
    windows = driver.window_handles
    driver.switch_to.window(windows[1])
    sleep(1)
    auth_tkn = "Bearer " + driver.execute_script('return JSON.parse(localStorage[`account_${localStorage.account_id}`]).access_token;')

    driver.execute_script('window.close();')
    driver.switch_to.window(main_window)
    sleep(1)

    links = driver.find_elements_by_tag_name("a")

    breaker = False
    ask = True

    # Interate over links...
    for i in range(len(links)):

        try:
            lesson_name = links[i].text
            referer_url = links[i].get_attribute("href")
            lesson_id = links[i].get_attribute("id")

            # ...and check if file was already downloaded (exists with this filename)
            if exists(join(abspath("."), f"{lesson_name}.mp4")):
                # If so, increase counter and go to another link
                skips += 1
                continue

            # Else go next
            else:
                pass

            # If there were videos to skip AND html_repair is specified by Operator.py...
            if skips > 0 and html_repair is True:

                # ...we need another list with ONLY videos. Giving skips parameter to OperatorShited.py function
                from .OperatorShifted import operator_shifted
                operator_shifted(driver, course_link, skips, called=True)
                sleep(1)

                # Finish video_download, when operator_shifted and new instance of video_download are finished their work
                return True

            if ask is True:
                print(f"\n{lesson_name}\n")
                print("""\n
Введи ">" чтобы пропустить видео\n
Введи "Y" чтобы скачать ТОЛЬКО это видео\n
Введи "Y+" чтобы скачать это видео и последующие\n
Нажми Enter чтобы просто скачать\n
Введи "E" чтобы выйти.\n """)

                skip_handler = input("Ввод: ")
                print("\n===\n")

                if skip_handler == ">":
                    continue

                elif skip_handler == "Y" or skip_handler == "y":
                    breaker = True

                elif skip_handler == "Y+" or skip_handler == "y+":
                    ask = False

                elif skip_handler == "E" or skip_handler == "e":
                    exit()

                else:
                    pass

            m3u8_id = ''.join(x for x in parse_qs(urlparse(referer_url).query)['conf']).split('-')[-1]
            sleep(1)
            s = Session()

            if machine().endswith('64'):
                if not exists('./modules/ffmpeg/x64/ffmpeg.exe'):
                    x64_ffmpeg = s.get("https://ffmpeg.zeranoe.com/builds/win64/static/ffmpeg-20180130-42323c3-win64-static.zip", stream=True)

                    print("\nСкачиваю FFMpeg...\n")

                    with open("ffmpeg-20180130-42323c3-win64-static.zip", 'wb') as x64ff:
                        copyfileobj(x64_ffmpeg.raw, x64ff)

                    Archive('ffmpeg-20180130-42323c3-win64-static.zip').extractall('./modules/ffmpeg/x64/')

                    move('./modules/ffmpeg/x64/ffmpeg-20180130-42323c3-win64-static/bin/ffmpeg.exe', './modules/ffmpeg/x64/ffmpeg.exe')

                    rmtree('./modules/ffmpeg/x64/ffmpeg-20180130-42323c3-win64-static')

                    unlink('./ffmpeg-20180130-42323c3-win64-static.zip')

                    print("Готово.")

            else:
                if not exists('./modules/ffmpeg/x86/ffmpeg.exe'):
                    x86_ffmpeg = s.get("https://ffmpeg.zeranoe.com/builds/win32/static/ffmpeg-20180130-42323c3-win32-static.zip", stream=True)

                    print("\nСкачиваю FFMpeg...\n")

                    with open("ffmpeg-20180130-42323c3-win32-static.zip", 'wb') as x86ff:
                        copyfileobj(x86_ffmpeg.raw, x86ff)

                    Archive('ffmpeg-20180130-42323c3-win32-static.zip').extractall('./modules/ffmpeg/x86/')

                    move('./modules/ffmpeg/x86/ffmpeg-20180130-42323c3-win32-static/bin/ffmpeg.exe', './modules/ffmpeg/x86/ffmpeg.exe')

                    rmtree('./modules/ffmpeg/x86/ffmpeg-20180130-42323c3-win32-static')

                    unlink('./ffmpeg-20180130-42323c3-win32-static.zip')

                    print("Готово.")

            if machine().endswith('64'):
                call(f"""{abspath("./modules/ffmpeg/x64/ffmpeg.exe")} -timeout 5000000 -reconnect 1 -reconnect_at_eof 1 -reconnect_streamed 1 -reconnect_delay_max 2 -headers "Authorization: {auth_tkn}" -headers "Referer: {referer_url}" -headers "Origin: https://lesson.foxford.ru" -user_agent "Mozilla/5.0 (iPhone; CPU iPhone OS 10_3 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) CriOS/56.0.2924.75 Mobile/14E5239e Safari/602.1" -i "https://media-store.foxford.ru:10002/api/v1/buckets/foxford-media.webinar.hls/objects/{m3u8_id}.master.m3u8" -bsf:a aac_adtstoasc -c copy {abspath("./video.mp4")}""")

            else:
                call(f"""{abspath("./modules/ffmpeg/x86/ffmpeg.exe")} -timeout 5000000 -reconnect 1 -reconnect_at_eof 1 -reconnect_streamed 1 -reconnect_delay_max 2 -headers "Authorization: {auth_tkn}" -headers "Referer: {referer_url}" -headers "Origin: https://lesson.foxford.ru" -user_agent "Mozilla/5.0 (iPhone; CPU iPhone OS 10_3 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) CriOS/56.0.2924.75 Mobile/14E5239e Safari/602.1" -i "https://media-store.foxford.ru:10002/api/v1/buckets/foxford-media.webinar.hls/objects/{m3u8_id}.master.m3u8" -bsf:a aac_adtstoasc -c copy {abspath("./video.mp4")}""")

            while not exists(abspath("./video.mp4")):
                sleep(1)

            move("./video.mp4", f"./{lesson_name}.mp4")

            if breaker:
                break

        except ElementNotVisibleException:
            print("\nЭлемент не виден.\n")
            continue

        print('\nЗагрузка завершена.\n')
        print('---\n')

    print('\n---\n')
    sleep(1)
    driver.quit()
