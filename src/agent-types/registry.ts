export const agentTypesRegistry = [
    {
        type: 'survey-agent',
        locale: 'pl',
        description: 'Ten agent przeprowadza ankiety, zbiera dane od użytkowników i zapisuje je w bazie danych. Unika odpowiedzi na pytania nie związane z ankietą.',
        displayName: 'Agent przeprowadzający ankiety [Chat]'
    },
    {
        type: 'survey-agent',
        locale: 'en',
        description: 'This agent conducts surveys, collects data from users, and saves it in the database. It avoids answering questions unrelated to the survey.',
        displayName: 'Survey agent [Chat]'
    },
    {
        type: 'smart-assistant',
        locale: 'pl',
        description: 'Ten agent jest inteligentnym asystentem, który pomaga użytkownikom w codziennych zadaniach, odpowiada na pytania i dostarcza informacje.',
        displayName: 'Inteligentny asystent [Chat]'
    },
    {
        type: 'smart-assistant',
        locale: 'en',
        description: 'This agent is a smart assistant that helps users with daily tasks, answers questions, and provides information.',
        displayName: 'Smart assistant [Chat]'
    },
    {
        type: 'commerce-agent',
        locale: 'pl',
        description: 'Ten agent jest inteligentnym asystentem, który pomaga w zakupach, pozwala tworzyć zamówienia i przeglądać produkty',
        displayName: 'Asystent sprzedaży [Chat]'
    },
    {
        type: 'smart-assistant',
        locale: 'en',
        description: 'This agent is a smart assistant that helps with shopping, allows you to create orders, and browse products',
        displayName: 'Sales assistant [Chat]'
    },
    {
        type: 'flow',
        locale: 'en',
        description: 'This agent is a flow-based agent that allows you to create complex scenarios, automate processes, and develop apps that are called by API or other agents, using natural language. They can be used to create decision trees or integrations.',
        displayName: 'App / Workflow [API]'
    },
    {
        type: 'flow',
        locale: 'pl',
        description: 'Ten agent jest agentem opartym na przepływach, który pozwala na tworzenie złożonych scenariuszy, automatyzację procesów i rozwijanie aplikacji, które są wywoływane przez API lub inne agenty, za pomocą języka naturalnego. Mogą być używane do tworzenia drzew decyzyjnych lub integracji.',
        displayName: 'Aplikacja / Workflow [API]'
    }
]