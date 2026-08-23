import type { TivotStarterTopic } from '@shared/types'

export const TIVOT_STARTER_TOPICS: TivotStarterTopic[] = [
  {
    id: 'robot-instructions',
    title: 'Instrucciones al Robot',
    description: 'Ordena pasos para que tu robot complete una mision.',
    prompt: 'Quiero aprender que es un algoritmo dando instrucciones a un robot.',
    problemId: 'KID-SEQ-001',
    icon: 'robot',
  },
  {
    id: 'loop-dance',
    title: 'El Baile del Bucle',
    description: 'Repite acciones como una coreografia sencilla.',
    prompt: 'Quiero descubrir como funcionan los bucles con un baile que se repite.',
    problemId: 'KID-LUP-001',
    icon: 'repeat',
  },
  {
    id: 'secret-paths',
    title: 'Caminos Secretos',
    description: 'Elige que hacer cuando pasa algo distinto.',
    prompt: 'Quiero aprender decisiones con SI pasa esto y SI NO pasa aquello.',
    problemId: 'KID-CND-003',
    icon: 'decision',
  },
  {
    id: 'bug-hunt',
    title: 'Caza de Errores',
    description: 'Encuentra el paso que confundio al robot.',
    prompt: 'Quiero encontrar el error en las instrucciones de un robot.',
    problemId: 'KID-BUG-001',
    icon: 'bug',
  },
]
