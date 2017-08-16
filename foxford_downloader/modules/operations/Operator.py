from time import sleep

from .TheoryHTML import theory_html_gen
from .VideoHTML import video_html_gen
from .Downloader import theory_download, video_download
from .SortFiles import sort_files

from selenium.common.exceptions import ElementNotVisibleException, StaleElementReferenceException, NoSuchElementException
from selenium.webdriver.common.action_chains import ActionChains
from os import makedirs, unlink
from os.path import join, abspath, exists
from sys import exit


def operator(driver, course_link):
    lesson_name = ''
    course_name = ''
    main_window = driver.current_window_handle
    theoretic_data = {}
    download_links = {}

    driver.get(course_link)
    print('\n')

    if exists(join(abspath("."), "mp4.mp4.crdownload")):
        unlink(join(abspath("."), "mp4.mp4.crdownload"))

    else:
        pass

    if exists(join(abspath("."), "mp4.mp4")):
        unlink(join(abspath("."), "mp4.mp4"))

    else:
        pass

    try:
        course_name = str(driver.find_element_by_class_name("course_info_title").text).replace('"', '').replace("»", "").replace("«", "").replace("!", "").replace("?", "").replace(",", ".").replace("/", "").replace("\\", "").replace(":", "").replace("<", "").replace(">", "").replace("*", "")

        try:
            makedirs(join(abspath("."), course_name))

        except FileExistsError:
            pass

        print(course_name)
        sleep(1)

        if exists(join(abspath("."), course_name + "_theory.html")):
            print("Найдены предыдущие теоретические данные. Верифицирую...\n")
            theory_download(driver, course_name)
            print("Верификация теории завершена. Начата проверка видео.")
            sleep(1)

            if exists(join(abspath("."), course_name + "_videos.html")):
                print("Обнаружены предыдущие видео. Верифицирую...")
                video_download(driver, course_name, course_link, html_repair=True)
                print("Верификация видео завершена.")
                sleep(1)
                return True

            else:
                from .OperatorShifted import operator_shifted
                operator_shifted(driver, course_link, 0)
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
    lesson_links = driver.find_elements_by_class_name("lesson")
    print('\n---\n')

    try:
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
                lesson_name = str(driver.find_element_by_class_name("lesson_content").find_element_by_tag_name('h2').text).replace('"', '').replace("»", "").replace("«", "").replace("!", "").replace("?", "").replace(",", ".").replace("/", "").replace("\\", "").replace(":", "").replace("<", "").replace(">", "").replace("*", "")

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

                    try:
                        download_links[lesson_name] = driver.find_element_by_class_name("vjs-tech").get_attribute("src")
                        print("Видео получено.")
                        sleep(1)

                    except NoSuchElementException:
                        pass

                    try:
                        sleep(1)
                        video_link = "".join(html_escape_table.get(c, c) for c in driver.find_element_by_class_name("full_screen").find_element_by_tag_name("iframe").get_attribute("src"))
                        driver.execute_script('window.open(arguments[0], "_self");', video_link)
                        sleep(1)

                        download_links[lesson_name] = driver.find_element_by_class_name("vjs-tech").get_attribute("src")
                        print("Видео получено.")
                        sleep(1)

                    except NoSuchElementException:
                        print('Что-то пошло не так. Закрой все прочие браузеры и после 3-4 повторных попыток сообщи разработчику о проблеме.')
                        sleep(1)
                        exit(0)

                    driver.execute_script('window.close();')
                    driver.switch_to.window(main_window)
                    sleep(1)

                else:
                    print('Видео отключено.')
                    print('Идем дальше.')
                    sleep(1)

                print('---\n')

            except NoSuchElementException:
                print("Видео не обнаружено.")
                print("Идем дальше.")
                print('---\n')
                sleep(1)

            try:
                theory_link = driver.find_element_by_xpath("//i[@class='fxf_icon_small fxf_icon_conspects_blue']/..")
                if theory_link is not None and theory_link.get_attribute("class") != 'disabled':

                    driver.execute_script('window.open(arguments[0], "_blank");', theory_link.get_attribute("href"))

                    windows = driver.window_handles
                    driver.switch_to.window(windows[1])
                    sleep(1)

                    try:
                        theory_navigator = driver.find_elements_by_xpath("(//ul[@class='page_menu_list block_rounded_shadow'])[1]/*[position()>1]")
                        url = str(driver.current_url).split("/")

                        for i in range(len(theory_navigator)):
                            url[-1] = str(i + 1)
                            url_concat = "/".join(url)

                            driver.get(url_concat)
                            sleep(1)

                            theory_name = driver.find_element_by_class_name("info").find_element_by_tag_name('h1').text
                            theoretic_data[theory_name] = url_concat

                            sleep(1)

                        # print(theoretic_data)
                        print("Теория сохранена.")
                        print('---\n')
                        sleep(1)

                    except NoSuchElementException:
                        print('Произошла ошибка.')
                        print('---\n')
                        sleep(1)

                    driver.execute_script('window.close();')
                    driver.switch_to.window(main_window)
                    sleep(1)

                else:
                    print('Теория отключена.')
                    print('Идем дальше.')
                    print('---\n')
                    sleep(1)

            except NoSuchElementException:
                print("Теории не обнаружено.")
                print("Идем дальше.")
                print('---\n')
                sleep(1)

    except Exception as e:
        print("Критическая ошибка.")
        # print(e)
        exit(0)

    if len(theoretic_data.keys()) != 0:
        try:
            makedirs(join(abspath("."), course_name, "Теория"))

        except FileExistsError:
            pass

        theory_html_gen(course_name, theoretic_data)
        print("Список теории сформирован. Обрабатываю...")
        print('---\n')
        theory_download(driver, course_name)
        sleep(1)

    if len(download_links.keys()) != 0:
        video_html_gen(course_name, download_links)
        print("Список видео сформирован. Скачиваю...")
        print('---\n')
        video_download(driver, course_name, course_link)
        sleep(1)

    print('Сортируем видео и теорию по папкам...')
    sort_files(course_name)
    sleep(1)
