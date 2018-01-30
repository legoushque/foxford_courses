'''Imports'''

from time import sleep

from .TheoryHTML import theory_html_gen
from .HomeworkHTML import homework_html_gen
from .Downloader import theory_download, homework_download
from .SortFiles import sort_files

from selenium.common.exceptions import ElementNotVisibleException, StaleElementReferenceException, NoSuchElementException
from selenium.webdriver.common.action_chains import ActionChains
from os import makedirs
from os.path import join, abspath, exists
from sys import exit


def operator(driver, course_link):
    '''Operator module, which handles all actions to extract theory + videos'''

    lesson_name = None
    course_name = None
    subject_name = None
    main_window = driver.current_window_handle
    theoretic_data = {}
    homework_links = {}

    driver.get(course_link)  # <--- Make GET request towards course link
    print('\n')

    try:
        # Remove unsupported chars from course name and save it
        course_name = str(driver.find_element_by_class_name("course_info_title").text).replace('"', '').replace("»", "").replace("«", "").replace("!", "").replace("?", "").replace(",", ".").replace("/", "").replace("\\", "").replace(":", "").replace("<", "").replace(">", "").replace("*", "")

        sleep(1)

        subject_name = str(driver.find_element_by_class_name("course_info_subtitle").text).replace('"', '').replace("»", "").replace("«", "").replace("!", "").replace("?", "").replace(",", ".").replace("/", "").replace("\\", "").replace(":", "").replace("<", "").replace(">", "").replace("*", "")

        try:
            # Make directory with course name (SortFiles.py)
            makedirs(join(abspath("."), course_name))

        # Handle case, when download was broken
        except FileExistsError:
            pass

        print(course_name + '. ' + subject_name)
        sleep(1)

        # Starting check if download was really broken. Because video download goes exactly after theory, we check video after theory
        if exists(join(abspath("."), course_name + "_theory.html")):
            print("Найдены предыдущие теоретические данные. Верифицирую...\n")

            if exists(join(abspath("."), course_name + "_homework.html")):
                print("Теория в порядке.")
                print("Предыдущее ДЗ обнаружено. Верифицирую...\n")

                try:
                    homework_download(driver, course_name)
                    print("Верификация ДЗ завершена.")
                    sleep(1)
                    return True

                except KeyboardInterrupt:
                    print("Получение ДЗ сброшено.")
                    return True

            else:
                # Repair theory, if broken. Mechanism described in Download.py
                try:
                    theory_download(driver, course_name)
                    print("Верификация теории завершена. Начата проверка ДЗ.")
                    sleep(1)

                except KeyboardInterrupt:
                    print("Получение теории сброшено. Продолжаю...")

                from .OperatorHomework import operator_homework

                operator_homework(driver, course_link)
                sleep(1)

                # Everything downloaded, going to next link
                return True

        else:
            pass

    except ElementNotVisibleException:
        print("Элемент не виден.")
        sleep(1)
        pass

    try:

        # Workaround for active lesson not counting
        driver.find_element_by_class_name("lesson active")
        driver.execute_script("document.getElementsByClassName('lesson active')[0].classList.remove('active');")

    except NoSuchElementException:
        pass

    sleep(0.5)

    # Make an array of lessons
    lesson_links = driver.find_elements_by_class_name("lesson")
    print('\n---\n')

    try:
        # Iterate over all lessons ("-1" because of active one)
        for i in range(len(lesson_links) - 1):
            try:
                # Locate and click on it even if not visible
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
                # Set lesson_name...
                lesson_name = str(driver.find_element_by_class_name("lesson_content").find_element_by_tag_name('h2').text).replace('"', '').replace("»", "").replace("«", "").replace("!", "").replace("?", "").replace(",", ".").replace("/", "").replace("\\", "").replace(":", "").replace("<", "").replace(">", "").replace("*", "").replace("_", "")

                try:
                    # ...and make a folder for video from this lesson
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

            # HW getting
            try:
                # XPATH for homework link
                homework_link = driver.find_element_by_xpath("//i[@class='fxf_icon_small fxf_icon_tasks_blue']/..")
                if homework_link is not None and homework_link.get_attribute("class") != 'disabled':

                    driver.execute_script('window.open(arguments[0], "_blank");', homework_link.get_attribute("href"))

                    windows = driver.window_handles
                    driver.switch_to.window(windows[1])
                    sleep(1)

                    # Write to dictionary current url after each click.
                    try:
                        homework = driver.find_elements_by_xpath("(//div[@class='content-wrapper'])[1]/*[1]/*[position()>1]/*[1]/*[2]")

                        for i in range(len(homework)):
                            try:
                                ActionChains(driver).move_to_element(homework[i]).click(homework[i]).perform()
                                sleep(2)
                                task_name = driver.find_element_by_xpath("(//div[@class='content-wrapper'])[2]/*[1]/*[1]/*[2]/*[1]").text
                                homework_links[lesson_name + "_" + str(task_name).replace('"', '').replace("»", "").replace("«", "").replace("!", "").replace("?", "").replace(",", ".").replace("/", "").replace("\\", "").replace(":", "").replace("<", "").replace(">", "").replace("*", "").replace("_", "")] = driver.current_url
                                sleep(1)

                            except ElementNotVisibleException:
                                print("Элемент не виден.")
                                print('---\n')
                                sleep(1)

                            except StaleElementReferenceException:
                                print('Ошибка, связанная с большой задержкой ответа. Попробуй еще раз.')
                                print('---\n')
                                sleep(1)

                            except NoSuchElementException:
                                print('Что-то не так.')
                                print('---\n')
                                sleep(1)

                        print("ДЗ записано в очередь.")
                        print('---\n')

                    except NoSuchElementException:
                        print('Произошла ошибка.')
                        print('---\n')
                        sleep(1)

                    # Opening in new tab redirects to dashboard, if HW is not payed
                    except IndexError:
                        print('Кажется, ДЗ не оплачено.')
                        print('---\n')
                        sleep(1)

                    driver.execute_script('window.close();')
                    driver.switch_to.window(main_window)
                    sleep(1)

                # HW disabled
                else:
                    print('ДЗ отключено.')
                    print('Идем дальше.')
                    print('---\n')
                    sleep(1)

            # No HW
            except NoSuchElementException:
                print("ДЗ не обнаружено.")
                print("Ищу теорию.")
                print('---\n')
                sleep(1)

            # Theory getting
            try:
                # XPATH for theory link
                theory_link = driver.find_element_by_xpath("//i[@class='fxf_icon_small fxf_icon_conspects_blue']/..")
                if theory_link is not None and theory_link.get_attribute("class") != 'disabled':

                    # Open a new tab with theory link
                    driver.execute_script('window.open(arguments[0], "_blank");', theory_link.get_attribute("href"))

                    windows = driver.window_handles
                    driver.switch_to.window(windows[1])
                    sleep(1)

                    try:
                        # Get amount of theory (counts buttons except "back" one)
                        theory_navigator = driver.find_elements_by_xpath("(//ul[@class='page_menu_list block_rounded_shadow'])[1]/*[position()>1]")
                        url = str(driver.current_url).split("/")

                        for i in range(len(theory_navigator)):

                            # Buttons are not clickable by driver. Using workaround to "+1" to URL. (Handles first one, because i == 0 and link ending == 1)
                            url[-1] = str(i + 1)
                            url_concat = "/".join(url)

                            driver.get(url_concat)
                            sleep(1)

                            # Get name of theory (lesson_name + info) and bind it to link using dictionary
                            info = driver.find_element_by_class_name("info").find_element_by_tag_name('h1').text
                            theoretic_data[lesson_name + "_" + str(info).replace('"', '').replace("»", "").replace("«", "").replace("!", "").replace("?", "").replace(",", ".").replace("/", "").replace("\\", "").replace(":", "").replace("<", "").replace(">", "").replace("*", "").replace("_", "")] = url_concat

                            sleep(1)

                        print("Теория сохранена.")
                        print('---\n')
                        sleep(1)

                    except NoSuchElementException:
                        print('Произошла ошибка.')
                        print('---\n')
                        sleep(1)

                    # Close tab
                    driver.execute_script('window.close();')
                    driver.switch_to.window(main_window)
                    sleep(1)

                # Theory can also be disabled.
                else:
                    print('Теория отключена.')
                    print('Идем дальше.')
                    print('---\n')
                    sleep(1)

            # There may be no theory...
            except NoSuchElementException:
                print("Теории не обнаружено.")
                print("Идем дальше.")
                print('---\n')
                sleep(1)

    # Another "shit happened" case
    except Exception as e:
        # print(e)
        print("Критическая ошибка.")
        exit(0)

    # Download initiation section.

    # If dictionary with theory is not empty...
    if len(theoretic_data.keys()) != 0:
        try:
            # Generate HTML from dictionary data
            theory_html_gen(course_name, theoretic_data)
            print("Список теории сформирован. Обрабатываю...")
            print('---\n')

            # Make screenshots
            theory_download(driver, course_name)
            sleep(1)

        except KeyboardInterrupt:
            print("Получение теории сброшено. Продолжаю...")
            pass

    # If dictionary with hw is not empty...
    if len(homework_links.keys()) != 0:
        try:
            # Generate HTML from dictionary data
            homework_html_gen(course_name, homework_links)
            print("Список ДЗ сформирован. Скачиваю...")
            print('---\n')

            # Make screenshots
            homework_download(driver, course_name)
            sleep(1)

        except KeyboardInterrupt:
            print("Получение ДЗ сброшено. Продолжаю...")
            pass

    sort_files(course_name, subject_name)
    sleep(1)
