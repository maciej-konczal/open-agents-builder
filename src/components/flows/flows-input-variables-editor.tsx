'use client'
import React, { useState } from 'react'
import { FlowInputVariable, FlowInputType } from './types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TrashIcon } from 'lucide-react'

/** Lista do wyboru w <select> */
const INPUT_TYPES: FlowInputType[] = [
  'shortText',
  'url',
  'longText',
  'number',
  'json',
  'fileBase64',
]

// Prosty regex do walidacji nazwy zmiennej:
const variableNameRegex = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/

interface FlowInputVariablesEditorProps {
  variables: FlowInputVariable[]
  onChange: (updated: FlowInputVariable[]) => void
}

export function FlowInputVariablesEditor({
  variables,
  onChange,
}: FlowInputVariablesEditorProps) {
// Function to create a new variable with default values
  const createNewVariable = (): FlowInputVariable => ({
    name: '',
    description: '',
    required: false,
    type: 'shortText',
  })

// Adding a new variable
  const handleAddVariable = () => {
    onChange([...variables, createNewVariable()])
  }

// Deleting a variable
  const handleDeleteVariable = (index: number) => {
    const updated = variables.filter((_, i) => i !== index)
    onChange(updated)
  }

// Updating fields in an existing variable
  const updateVariable = (index: number, updatedFields: Partial<FlowInputVariable>) => {
    const newList = [...variables]
    newList[index] = { ...newList[index], ...updatedFields }
    onChange(newList)
  }

  return (
    <div>
      <div className="space-y-4">
        {variables.map((variable, index) => {
          // We will validate the variable name
          const isNameValid = variable.name === '' || variableNameRegex.test(variable.name)

          return (
            <Card key={index} className="p-4 border space-y-3">
              <div className="flex justify-between items-center">
                <Button variant="destructive" onClick={() => handleDeleteVariable(index)}>
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </div>

              {/* Nazwa zmiennej */}
              <div>
                <Label className="block text-sm">Nazwa (TS symbol):</Label>
                <Input
                  value={variable.name}
                  onChange={(e) => updateVariable(index, { name: e.target.value })}
                  placeholder="np. userEmail"
                />
                {!isNameValid && (
                  <p className="text-red-500 text-sm mt-1">
                    Nazwa nie jest poprawnym symbolem (np. userEmail, _count, $value).
                  </p>
                )}
              </div>

              {/* Opis */}
              <div>
                <Label className="block text-sm">Opis (opcjonalny):</Label>
                <Input
                  value={variable.description || ''}
                  onChange={(e) => updateVariable(index, { description: e.target.value })}
                  placeholder="np. Email użytkownika do wysyłki..."
                />
              </div>

              {/* Typ */}
              <div>
                <Label className="block text-sm">Typ:</Label>
                <select
                  className="border p-1 rounded"
                  value={variable.type}
                  onChange={(e) =>
                    updateVariable(index, { type: e.target.value as FlowInputType })
                  }
                >
                  {INPUT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Required */}
              <div className="flex items-center gap-2">
                <input
                  id={`required-checkbox-${index}`}
                  type="checkbox"
                  checked={variable.required}
                  onChange={(e) => updateVariable(index, { required: e.target.checked })}
                />
                <Label htmlFor={`required-checkbox-${index}`}>Wymagana</Label>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="mt-4">
        <Button onClick={handleAddVariable}>Dodaj zmienną</Button>
      </div>
    </div>
  )
}
