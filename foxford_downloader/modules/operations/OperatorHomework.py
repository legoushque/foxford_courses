'''Imports'''


from time import sleep

from .SortFiles import sort_files
from .HomeworkHTML import homework_html_gen
from .Downloader import homework_download

from selenium.common.exceptions import ElementNotVisibleException, StaleElementReferenceException, NoSuchElementException
from selenium.webdriver.common.action_chains import ActionChains


def operator_homework(driver, course_link):
    lesson_name = None
    course_name = None
    subject_name = None
    main_window = driver.current_window_handle
    homework_links = {}

    driver.get(course_link)
    print('\n')

    try:
        course_name = str(driver.find_element_by_class_name("course_info_title").text).replace('"', '').replace("»", "").replace("«", "").replace("!", "").replace("?", "").replace(",", ".").replace("/", "").replace("\\", "").replace(":", "").replace("<", "").replace(">", "").replace("*", "")

        sleep(1)

        subject_name = str(driver.find_element_by_class_name("course_info_subtitle").text).replace('"', '').replace("»", "").replace("«", "").replace("!", "").replace("?", "").replace(",", ".").replace("/", "").replace("\\", "").replace(":", "").replace("<", "").replace(">", "").replace("*", "")

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
