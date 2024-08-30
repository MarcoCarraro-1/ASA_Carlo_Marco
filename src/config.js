import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";

const boss = new DeliverooApi(
    "http://localhost:8080",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImJlMDIwMDgyODFiIiwibmFtZSI6ImV4aW5lZiIsImlhdCI6MTcyMzg5MjE0NX0.ib3Q-ib3YVcIPxWSCZfyhyFjBVV88vI1-0-ewQuiTA4"    
    );

const worker = new DeliverooApi(
    "http://localhost:8080",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImY2MWM5ODlkMThhIiwibmFtZSI6ImJhcnQiLCJpYXQiOjE3MjM5NzI0ODB9.xEI2B7EKeYUos0rSlXTEk1xhnrTIGNAmwpqIUnKAikc"
    );

export { boss, worker }