# puffin_node

Авторская реализация узла примитивной блокчейн сети для воркшопа по блокчейну, проводимого в рамках puffin camp

Этот пример использует redis как внешнее хранилище данных (блоков), поэтому запустите redis без пароля на стандартном порту

Для запуска одного узла воспользуйтесь готовым скриптом startnode.sh отредактировав в нем предварительно переменные окруженя

или задайте переменные окружения PORT, REDIS_CONNECTION (1..10), ID, NAME

после запуска можно взаимодействовать с узлом по таким ендпоинтам

/state выводит текущее состоение - id, name, neighbours, last_hash


POST /management/add_transaction - добавить условные данные (транзакцию)  к списку транзакций. когда наберется 5, будет сформирован новый блок, который будет отправлен соседям
  {
    from:string,
    to:string,
    amount:int
  }
POST /management/add_link - добавление "соседа", с которым можно синхронизироваться
  {
    id:int,
    url:string
  }
GET /management/sync  - вызываем мы что б скачать с соседей начальный блокчейн

GET /management/status - получить текущий статус
  {id:string,}

GET /blockchain/get_blocks/:num_blocks
[
{
  hash:string,
  prev_hash:string,
  ts:unix_timestamp,int,
  tx:[
  {
    from:string,
    to:string,
    amount:int
  }
  ]

}
]

POST /blockchain/receive_update - обраобтать обновление, отправленное кем-то из соседей (как правило новый блок)
{
  sender_id:string,
  blocks:[
  {
    hash:string,
    prev_hash:string,
    ts:unix_timestamp,
    tx:[{ from:string, to:string, amount:int}]
  }
  ]
}

=======================
для запуска сети из нескольких узлов, запустите несколько экземпляров с разными PORT, REDIS_CONNECTION, ID, NAME
например можете воспользовться скриптами startnode1.sh, startnode2.sh, startnode3.sh и addlinks.sh для создания связей между ними

add_transaction.sh для добавления транзакции на первый узел

используйте npm run flush что бы очистить бд
