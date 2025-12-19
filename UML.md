# Clinic Server UML Documentation

This document provides a visual representation of the Clinic Server's architecture, data models, and key business processes using Mermaid diagrams.

## 1. Class Diagram (Domain Models)

The following diagram shows the core entities of the system: `User` and `Appointment`, including their attributes, types, and relationships.

```mermaid
classDiagram
    class UserRole {
        <<enumeration>>
        doctor
        patient
    }

    class AppointmentStatus {
        <<enumeration>>
        pending
        confirmed
        cancelled
        completed
    }

    class User {
        +id: number | string
        +name: string
        +email: string
        +password: string
        +imgLink: string
        +phone: string
        +role: UserRole
        +specialization: string
        +createdAt: Date
        +updatedAt: Date
        +toJSON()
    }

    class Appointment {
        +id: number | string
        +patientId: number | string
        +doctorId: number | string
        +startAt: Date
        +endAt: Date
        +durationMinutes: number
        +status: AppointmentStatus
        +reason: string
        +notes: string
        +createdAt: Date
        +updatedAt: Date
        +toJSON()
    }

    User "1" -- "*" Appointment : has (as Patient)
    User "1" -- "*" Appointment : has (as Doctor)
    Appointment "1" -- "1" User : belongsTo (Patient)
    Appointment "1" -- "1" User : belongsTo (Doctor)
```

## 2. Sequence Diagram (Create Appointment)

This diagram illustrates the process of creating a new appointment, showing the interaction between the API layer, service layer, and persistence layer.

```mermaid
sequenceDiagram
    participant P as Patient (Client)
    participant C as AppointmentController
    participant S as AppointmentService
    participant M as Appointment Model
    participant U as User Model

    P->>C: POST /api/v1/appointments
    C->>S: createAppointment(payload)
    
    S->>U: findByPk(doctorId)
    U-->>S: Doctor Object
    
    alt Doctor not found or not a doctor
        S-->>C: throw Error("Doctor not found")
        C-->>P: 404 Not Found
    else Doctor exists
        S->>S: Validate startAt in future
        S->>M: findOne (check overlap)
        M-->>S: Conflict result
        
        alt Overlap exists
            S-->>C: throw Error("Time slot conflict")
            C-->>P: 409 Conflict
        else No overlap
            S->>M: create(appointmentData)
            M-->>S: Appointment Object
            S-->>C: Appointment Object
            C-->>P: 201 Created (Success)
        end
    end
```

## 3. High-Level Architecture

The system follows a typical Controller-Service-Model architecture pattern.

```mermaid
graph TD
    Client[Client Application] --> Routes[Express Routes]
    Routes --> Controllers[Controllers]
    Controllers --> Middlewares[Middlewares (Auth, Validation)]
    Controllers --> Services[Services (Business Logic)]
    Services --> Models[Models (Sequelize)]
    Models --> DB[(PostgreSQL Database)]
```
