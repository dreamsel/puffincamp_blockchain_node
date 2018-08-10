curl -H "Content-Type: application/json" -X POST -d '{"id":"22","url":"http://localhost:8082"}' http://localhost:8081/management/add_link
curl -H "Content-Type: application/json" -X POST -d '{"id":"22","url":"http://localhost:8082"}' http://localhost:8083/management/add_link
curl -H "Content-Type: application/json" -X POST -d '{"id":"33","url":"http://localhost:8083"}' http://localhost:8082/management/add_link
curl -H "Content-Type: application/json" -X POST -d '{"id":"11","url":"http://localhost:8081"}' http://localhost:8083/management/add_link
