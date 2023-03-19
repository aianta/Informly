//Define common options and default values for the extension
_informly_defaultMap = new Map()
_informly_defaultMap.set('_openai_key', '')
_informly_defaultMap.set('_openai_org', '')
_informly_defaultMap.set('_openai_url','https://api.openai.com/v1/chat/completions')
_informly_defaultMap.set('_dbpedia_spotlight_url', 'https://api.dbpedia-spotlight.org/en')
_informly_defaultMap.set('_input_timeout', 5000)
_informly_defaultMap.set('_fade_timeout', 4000)
_informly_defaultMap.set('_thank_timeout', 2000)
_informly_defaultMap.set('_min_snippet_length', 1)
_informly_defaultMap.set('_min_sentences', 1) 
_informly_defaultMap.set('_allow_negative_samples', true) //TODO: change to false
_informly_defaultMap.set('_allow_positive_samples', true) //TODO: change to false
_informly_defaultMap.set('_geographic_region', 'na')