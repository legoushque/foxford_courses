export default function(data) {
  return `
    <!DOCTYPE html>
    <html lang="en" dir="ltr">
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta
        name="viewport"
        content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no"
        />
        <title>${data.name}</title>

        <link
        rel="preload"
        as="style"
        href="https://cdnjs.cloudflare.com/ajax/libs/bulma/0.7.1/css/bulma.min.css"
        onload="this.rel='stylesheet';this.removeAttribute('as')"
        />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.5/MathJax.js?config=TeX-MML-AM_CHTML"></script>
        <script>
        MathJax.Hub.Config({
            extensions: ["tex2jax.js"],
            jax: ["input/TeX", "output/HTML-CSS"],
            tex2jax: { inlineMath: [["$", "$"], ["\\(", "\\)"]] }
        });

        MathJax.Hub.Queue([
            "Typeset",
            MathJax.Hub,
            document.querySelector("section.is-info > h1.title")
        ]);
        MathJax.Hub.Queue([
            "Typeset",
            MathJax.Hub,
            document.querySelector("section.is-info > h2.subtitle")
        ]);
        MathJax.Hub.Queue([
            "Typeset",
            MathJax.Hub,
            document.querySelector("section.is-info > h3.subtitle")
        ]);

        MathJax.Hub.Queue([
            "Typeset",
            MathJax.Hub,
            document.querySelector("section.is-success > h1.title")
        ]);
        MathJax.Hub.Queue([
            "Typeset",
            MathJax.Hub,
            document.querySelector("section.is-success > h2.subtitle")
        ]);
        MathJax.Hub.Queue([
            "Typeset",
            MathJax.Hub,
            document.querySelector("section.is-success > h3.subtitle")
        ]);
        </script>
    </head>
    <body>
        <section class="hero is-info is-fullheight">
        <div class="hero-body">
            <div class="container">
                <h1 class="title"><p>${data.name}</p></h1>
                <h2 class="subtitle">${data.content}</h2>
                ${
                  data.questions.length === 1 && data.questions[0].header === ""
                    ? '<p class="MsoNormal">&nbsp;</p>'
                    : '<h3 class="subtitle"><p><strong>Вопрос' +
                      (data.questions.length === 1 ? ":" : "ы:") +
                      '</strong></p><p class="MsoNormal">&nbsp;</p>' +
                      data.questions
                        .map(
                          (item, i) =>
                            "<p>" + (i + 1) + ". " + item.header + "</p>"
                        )
                        .join("") +
                      "</h3>"
                }
            </div>
        </div>
        </section>
        <section class="hero is-success is-medium">
        <div class="hero-body">
            <div class="container">
            <h1 class="title"><p>Решение</p></h1>
            ${
              data.solution
                ? '<h2 class="subtitle">' + data.solution + "</h2>"
                : "<div></div>"
            }
            ${'<h3 class="subtitle"><p><strong>Ответ' +
              (data.questions.length === 1 ? ":" : "ы:") +
              '</strong></p><p class="MsoNormal">&nbsp;</p>' +
              data.questions
                .map(
                  (item, i) =>
                    "<p>" +
                    (i + 1) +
                    ". " +
                    (item["correct_answers"]
                      ? item["correct_answers"].join(", ")
                      : item.answers
                          .filter(ans => ans.correct)
                          .map(ans => ans.content)
                          .join(", ")) +
                    "</p>"
                )
                .join("") +
              "</h3>"}
            </div>
        </div>
        </section>
    </body>
    </html>
    `;
}
