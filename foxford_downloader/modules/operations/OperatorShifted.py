'''Imports'''


from time import sleep
from os import makedirs
from os.path import join, abspath, exists

from .VideoHTML import video_html_gen
from .Downloader import video_download
from .SortFiles import sort_files

from selenium.common.exceptions import ElementNotVisibleException, StaleElementReferenceException, NoSuchElementException
from selenium.webdriver.common.action_chains import ActionChains


def operator_shifted(driver, course_link, skips, called=False):
    '''Operator module, which handles all actions to extract only videos'''

    lesson_name = None
    course_name = None
    subject_name = None
    main_window = driver.current_window_handle
    download_links = {}
    webinar_ids = {}

    driver.get(course_link)
    print('\n')

    try:
        course_name = str(driver.find_element_by_class_name("course_info_title").text).replace('"', '').replace("»", "").replace("«", "").replace("!", "").replace("?", "").replace(",", ".").replace("/", "").replace("\\", "").replace(":", "").replace("<", "").replace(">", "").replace("*", "")

        sleep(1)

        subject_name = str(driver.find_element_by_class_name("course_info_subtitle").text).replace('"', '').replace("»", "").replace("«", "").replace("!", "").replace("?", "").replace(",", ".").replace("/", "").replace("\\", "").replace(":", "").replace("<", "").replace(">", "").replace("*", "")

        try:
            makedirs(join(abspath("."), course_name))

        except FileExistsError:
            pass

        print(course_name + '. ' + subject_name)
        sleep(1)

        if called is False:
            if exists(join(abspath("."), course_name + "_videos.html")):
                print("Обнаружены предыдущие видео. Верифицирую...")
                video_download(driver, course_name, course_link, html_repair=True)
                print("Верификация видео завершена.")
                sleep(1)
                return True

        else:
            pass

    except ElementNotVisibleException:
        print("Элемент не виден.")
        sleep(1)
        pass

    try:
        driver.find_element_by_class_name("lesson active")
        driver.execute_script("document.getElementsByClassName('lesson active')[0].classList.remove('active');")

    except NoSuchElementException:
        pass

    sleep(0.5)

    # This one is handling skips for HTML repair. Look in Operator.py, verification stage.
    lesson_links = driver.find_elements_by_class_name("lesson")[skips:]
    print('\n---\n')

    for i in range(len(lesson_links) - 1):
        try:
            ActionChains(driver).move_to_element(lesson_links[i]).click(lesson_links[i]).perform()
            sleep(1)

        except ElementNotVisibleException:
            print("Элемент не виден.")
            sleep(1)
            continue

        except StaleElementReferenceException:
            print('Ошибка, связанная с большой задержкой ответа. Попробуй еще раз.')
            sleep(1)
            continue

        try:
            lesson_name = str(driver.find_element_by_class_name("lesson_content").find_element_by_tag_name('h2').text).replace('"', '').replace("»", "").replace("«", "").replace("!", "").replace("?", "").replace(",", ".").replace("/", "").replace("\\", "").replace(":", "").replace("<", "").replace(">", "").replace("*", "").replace("_", "")

            try:
                makedirs(join(abspath("."), course_name, lesson_name))

            except FileExistsError:
                pass

            print(lesson_name)

        except ElementNotVisibleException:
            print("Элемент не виден.")
            sleep(1)
            continue

        except StaleElementReferenceException:
            print("Название не будет выведено автоматически.")
            continue

        try:
            webinar_link = driver.find_element_by_xpath("//i[@class='fxf_icon_small fxf_icon_video_blue']/..")
            if webinar_link is not None and webinar_link.get_attribute("class") != 'disabled':
                webinar_ids[lesson_name] = webinar_link.get_attribute("href").split("/")[-1]

                driver.execute_script('window.open(arguments[0], "_blank");', webinar_link.get_attribute("href"))

                windows = driver.window_handles
                driver.switch_to.window(windows[1])
                sleep(1)

                html_escape_table = {
                    "&": "&amp;",
                    '"': "&quot;",
                    "'": "&apos;",
                    ">": "&gt;",
                    "<": "&lt;",
                }

                sleep(1)
                video_link = "".join(html_escape_table.get(c, c) for c in driver.find_element_by_class_name("full_screen").find_element_by_tag_name("iframe").get_attribute("src"))

                download_links[lesson_name] = video_link
                print('Видео получено.')

                driver.execute_script('window.close();')
                driver.switch_to.window(main_window)
                sleep(1)

            else:
                print('Видео отключено.')
                print('Кажется, конец пути.')
                break
                sleep(1)

            print('---\n')

        except NoSuchElementException:
            print("Видео не обнаружено.")
            print("Идем дальше.")
            print('---\n')
            sleep(1)

    if len(download_links.keys()) != 0:
        video_html_gen(course_name, download_links, webinar_ids)
        print("Список видео сформирован. Скачиваю...")
        print('---\n')
        video_download(driver, course_name, course_link)
        sleep(1)

    print('Сортируем видео по папкам...')
    sort_files(course_name, subject_name)
    sleep(1)
